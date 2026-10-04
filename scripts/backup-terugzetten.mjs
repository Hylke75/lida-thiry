// Zet een back-up (Beheer → Instellingen → Back-up) terug in een Supabase-project,
// bedoeld voor de TESTDATABASE (zie docs/backup-en-herstel.md). Tabel voor tabel,
// in de volgorde uit het manifest (eerst de tabellen waar andere naar verwijzen),
// met upsert op de primaire sleutel: bestaande rijen worden overschreven, rijen die
// niet in de back-up staan blijven staan.
//
// Gebruik:
//   node scripts/backup-terugzetten.mjs <back-up.json.gz> --url https://<ref>.supabase.co --sleutel <service-role-sleutel>
//
// Opties:
//   --url, --sleutel      doelproject (of env DOEL_SUPABASE_URL / DOEL_SUPABASE_SERVICE_ROLE_KEY)
//   --alleen-inhoud       alleen inhoud en instellingen, geen persoonsgegevens van klanten
//   --tabellen a,b,c      alleen deze tabellen
//   --droog               alleen tonen wat er zou gebeuren
//   --ik-weet-het-zeker   ook toestaan als het doel de productiedatabase is (of dat niet te controleren is)
//
// Veiligheid: weigert als het doel gelijk is aan PRODUCTIE_SUPABASE_URL of
// PRODUCTIE_SUPABASE_REF (uit de omgeving of .env.local), en ook als die niet is
// ingesteld, tenzij --ik-weet-het-zeker. Leest bewust NIET de gewone
// NEXT_PUBLIC_SUPABASE_URL uit .env.local als doel.

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

const BATCH = 500;

/** Project-ref uit een Supabase-URL (https://<ref>.supabase.co), anders de host. */
export function refVan(url) {
  if (!url) return null;
  try {
    const host = new URL(String(url).trim()).hostname.toLowerCase();
    const m = host.match(/^([a-z0-9]+)\.supabase\.(co|in|net)$/);
    return m ? m[1] : host;
  } catch {
    return null;
  }
}

/** "productie" | "onbekend" | "ok" */
export function doelControle(doelUrl, env) {
  const productie = env.PRODUCTIE_SUPABASE_REF?.trim().toLowerCase() || refVan(env.PRODUCTIE_SUPABASE_URL);
  if (!productie) return "onbekend";
  return refVan(doelUrl) === productie ? "productie" : "ok";
}

/** Welke tabellen (uit het manifest) teruggezet worden, in volgorde. */
export function teHerstellen(manifest, opties = {}) {
  const alleen = opties.tabellen ? new Set(opties.tabellen) : null;
  return manifest.tabellen.filter(
    (t) => !t.nietTerugzetten && !(opties.alleenInhoud && t.persoonsgegevens) && (!alleen || alleen.has(t.naam)),
  );
}

/** Rijen klaarmaken: identiteitskolom weg, uitgestelde kolommen eerst leeg. */
export function bereidRijen(tabel, rijen) {
  return rijen.map((r) => {
    const kopie = { ...r };
    if (tabel.identiteit) delete kopie.id;
    for (const k of tabel.uitgesteld ?? []) if (k in kopie) kopie[k] = null;
    return kopie;
  });
}

function leesArgumenten(argv) {
  const opties = { bestand: null, url: null, sleutel: null, alleenInhoud: false, tabellen: null, droog: false, zeker: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--url") opties.url = argv[++i];
    else if (a === "--sleutel") opties.sleutel = argv[++i];
    else if (a === "--tabellen") opties.tabellen = String(argv[++i] ?? "").split(",").filter(Boolean);
    else if (a === "--alleen-inhoud") opties.alleenInhoud = true;
    else if (a === "--droog") opties.droog = true;
    else if (a === "--ik-weet-het-zeker") opties.zeker = true;
    else if (!a.startsWith("--") && !opties.bestand) opties.bestand = a;
    else throw new Error(`Onbekende optie: ${a}`);
  }
  return opties;
}

function laadEnvLocal() {
  const pad = join(dirname(fileURLToPath(import.meta.url)), "..", ".env.local");
  const uit = {};
  if (!existsSync(pad)) return uit;
  for (const l of readFileSync(pad, "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) uit[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return uit;
}

async function hoofd() {
  const opties = leesArgumenten(process.argv.slice(2));
  const lokaal = laadEnvLocal();
  const env = {
    PRODUCTIE_SUPABASE_URL: process.env.PRODUCTIE_SUPABASE_URL ?? lokaal.PRODUCTIE_SUPABASE_URL,
    PRODUCTIE_SUPABASE_REF: process.env.PRODUCTIE_SUPABASE_REF ?? lokaal.PRODUCTIE_SUPABASE_REF,
  };
  const url = opties.url ?? process.env.DOEL_SUPABASE_URL;
  const sleutel = opties.sleutel ?? process.env.DOEL_SUPABASE_SERVICE_ROLE_KEY;
  if (!opties.bestand || !url || !sleutel) {
    console.error("Gebruik: node scripts/backup-terugzetten.mjs <back-up.json.gz> --url <doel-URL> --sleutel <service-role-sleutel>");
    process.exit(1);
  }

  const controle = doelControle(url, env);
  if (controle === "productie" && !opties.zeker) {
    console.error(`GEWEIGERD: ${url} is de productiedatabase. Gebruik --ik-weet-het-zeker als dit echt de bedoeling is.`);
    process.exit(2);
  }
  if (controle === "onbekend" && !opties.zeker) {
    console.error(
      "GEWEIGERD: PRODUCTIE_SUPABASE_URL of PRODUCTIE_SUPABASE_REF is niet ingesteld, dus niet te controleren of het doel de productiedatabase is.\n" +
        "Zet een van beide (in de omgeving of .env.local), of gebruik --ik-weet-het-zeker.",
    );
    process.exit(2);
  }

  const ruw = readFileSync(opties.bestand);
  const tekst = ruw[0] === 0x1f && ruw[1] === 0x8b ? gunzipSync(ruw).toString("utf8") : ruw.toString("utf8");
  const backup = JSON.parse(tekst);
  if (backup?.formaat !== "lida-thiry-backup" || backup.versie !== 1 || !backup.manifest?.tabellen || !backup.tabellen) {
    console.error("Dit is geen (volledige) lida-thiry-back-up van versie 1.");
    process.exit(1);
  }
  const tabellen = teHerstellen(backup.manifest, opties);
  console.log(
    `Back-up van ${backup.manifest.gemaakt_op} (project ${backup.manifest.project ?? "?"}) → ${url}\n` +
      `${tabellen.length} tabellen${opties.alleenInhoud ? " (alleen inhoud, zonder persoonsgegevens)" : ""}${opties.droog ? " — DROOG, er wordt niets geschreven" : ""}.`,
  );

  const supabase = createClient(url, sleutel, { auth: { persistSession: false } });
  let fouten = 0;
  for (const t of tabellen) {
    const rijen = backup.tabellen[t.naam] ?? [];
    if (!rijen.length) {
      console.log(`- ${t.naam}: leeg`);
      continue;
    }
    if (t.identiteit) {
      // Zonder vaste id is opnieuw invoegen dubbel: alleen in een lege tabel.
      const { count } = await supabase.from(t.naam).select("*", { count: "exact", head: true });
      if (count) {
        console.log(`- ${t.naam}: overgeslagen (al ${count} rijen; id's worden opnieuw uitgedeeld)`);
        continue;
      }
    }
    if (opties.droog) {
      console.log(`- ${t.naam}: ${rijen.length} rijen`);
      continue;
    }
    const klaar = bereidRijen(t, rijen);
    let gelukt = 0;
    for (let i = 0; i < klaar.length; i += BATCH) {
      const deel = klaar.slice(i, i + BATCH);
      const { error } = t.identiteit
        ? await supabase.from(t.naam).insert(deel)
        : await supabase.from(t.naam).upsert(deel, { onConflict: t.sleutel.join(",") });
      if (error) {
        fouten++;
        console.error(`- ${t.naam}: FOUT bij rij ${i + 1}–${i + deel.length}: ${error.message}`);
        break;
      }
      gelukt += deel.length;
    }
    console.log(`- ${t.naam}: ${gelukt}/${rijen.length} rijen`);
  }

  // Tweede ronde: uitgestelde kolommen (kringverwijzingen) invullen.
  if (!opties.droog) {
    for (const t of tabellen.filter((x) => x.uitgesteld?.length)) {
      for (const r of backup.tabellen[t.naam] ?? []) {
        const waarden = Object.fromEntries(t.uitgesteld.filter((k) => r[k] != null).map((k) => [k, r[k]]));
        if (!Object.keys(waarden).length) continue;
        let q = supabase.from(t.naam).update(waarden);
        for (const k of t.sleutel) q = q.eq(k, r[k]);
        const { error } = await q;
        if (error) {
          fouten++;
          console.error(`- ${t.naam}: ${t.uitgesteld.join(", ")} invullen mislukt: ${error.message}`);
        }
      }
    }
  }

  console.log(fouten ? `Klaar met ${fouten} fout(en).` : "Klaar.");
  console.log("Let op: bestanden in de opslag (PDF's, afbeeldingen) en beheerders zitten niet in de back-up; zie docs/backup-en-herstel.md.");
  process.exit(fouten ? 1 : 0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  hoofd().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
