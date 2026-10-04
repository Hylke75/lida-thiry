// Bundelt alle migraties (supabase/migrations/*.sql, op bestandsnaam = tijdstip)
// tot één bestand supabase/alle-migraties.sql, om in de SQL-editor van een nieuw,
// leeg Supabase-project te plakken (bijv. de testdatabase voor previews; zie
// docs/testomgeving.md). Het geheel draait in één transactie: lukt één stap niet,
// dan wordt niets toegepast.
//
// Gebruik: node scripts/migraties-bundelen.mjs [uitvoerbestand]
//
// NOOIT op de productiedatabase draaien: die heeft deze migraties al.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** Alleen echte migraties: <tijdstip>_<naam>.sql, op volgorde van de bestandsnaam. */
export function sorteerMigraties(namen) {
  return namen.filter((n) => /^\d{14}_[\w-]+\.sql$/.test(n)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * Plakt de migraties aan elkaar met een kop per bestand.
 * @param {{ naam: string, sql: string }[]} migraties al gesorteerd
 */
export function bundel(migraties, gemaaktOp = new Date()) {
  const kop = [
    "-- Alle migraties van lida-thiry in één bestand (gegenereerd door",
    "-- scripts/migraties-bundelen.mjs; niet met de hand aanpassen).",
    `-- Gemaakt op ${gemaaktOp.toISOString()}, ${migraties.length} migraties.`,
    "--",
    "-- Alleen voor een NIEUW, LEEG Supabase-project (bijv. de testdatabase).",
    "-- Plak dit in Supabase → SQL Editor en klik Run. Draait in één transactie.",
    "",
    "begin;",
    "",
  ];
  const delen = migraties.map(({ naam, sql }) =>
    [`-- ============================================================================`, `-- ${naam}`, `-- ============================================================================`, sql.trimEnd(), ""].join("\n"),
  );
  return `${kop.join("\n")}${delen.join("\n")}\ncommit;\n`;
}

function hoofd() {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const map = join(root, "supabase", "migrations");
  const uit = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(root, "supabase", "alle-migraties.sql");
  const namen = sorteerMigraties(readdirSync(map));
  const overgeslagen = readdirSync(map).filter((n) => n.endsWith(".sql") && !namen.includes(n));
  const migraties = namen.map((naam) => ({ naam, sql: readFileSync(join(map, naam), "utf8") }));
  writeFileSync(uit, bundel(migraties));
  console.log(`${migraties.length} migraties gebundeld in ${relative(process.cwd(), uit) || uit}.`);
  if (overgeslagen.length) console.warn(`Overgeslagen (naam past niet in <tijdstip>_<naam>.sql): ${overgeslagen.join(", ")}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) hoofd();
