// Formaat van de back-up (JSON, meestal gzip) en de controle ervan. Puur, zodat
// het ook in de browser draait (Beheer → Back-up → Back-up controleren) en in tests.
//
// {
//   "formaat": "lida-thiry-backup", "versie": 1, "gemaakt_op": "…",
//   "tabellen": { "orders": [ {…}, … ], … },
//   "manifest": { … tellingen, tabelvolgorde, opslag … }
// }

import { BACKUP_FORMAAT, BACKUP_TABELLEN, BACKUP_VERSIE, type BackupTabel } from "./tabellen";

export interface ManifestTabel {
  naam: string;
  aantal: number;
  sleutel: string[];
  identiteit?: boolean;
  uitgesteld?: string[];
  persoonsgegevens?: boolean;
  nietTerugzetten?: boolean;
  /** Foutmelding als de tabel niet gelezen kon worden (dan aantal 0). */
  fout?: string;
}

export interface OpslagBucket {
  naam: string;
  publiek: boolean;
  bestanden: number;
  bytes: number;
  /** true als het tellen is afgebroken (te veel mappen/bestanden). */
  onvolledig?: boolean;
}

export interface BackupManifest {
  formaat: typeof BACKUP_FORMAAT;
  versie: number;
  gemaakt_op: string;
  /** Supabase-project waar de back-up van is gemaakt. */
  project: string | null;
  tabellen: ManifestTabel[];
  opslag: { buckets: OpslagBucket[]; fout?: string };
  opmerking: string;
}

export const OPSLAG_OPMERKING =
  "Bestanden in de opslag (advies-PDF's, facturen, afbeeldingen) zitten niet in deze back-up; " +
  "het manifest noemt per bucket het aantal bestanden en de grootte. Zie docs/backup-en-herstel.md.";

export function manifestTabel(t: BackupTabel, aantal: number, fout?: string): ManifestTabel {
  return {
    naam: t.naam,
    aantal,
    sleutel: [...t.sleutel],
    ...(t.identiteit ? { identiteit: true } : {}),
    ...(t.uitgesteld?.length ? { uitgesteld: [...t.uitgesteld] } : {}),
    ...(t.persoonsgegevens ? { persoonsgegevens: true } : {}),
    ...(t.nietTerugzetten ? { nietTerugzetten: true } : {}),
    ...(fout ? { fout } : {}),
  };
}

/** Bestandsnaam: lida-thiry-backup-2026-10-04-1503.json.gz (Nederlandse tijd). */
export function backupBestandsnaam(nu: Date): string {
  const d = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .format(nu)
    .replace(" ", "-")
    .replace(":", "");
  return `${BACKUP_FORMAAT}-${d}.json.gz`;
}

export interface TabelControle {
  naam: string;
  inBestand: number;
  /** Aantal volgens het manifest. */
  volgensManifest: number | null;
}

export type BackupControle =
  | {
      ok: true;
      gemaakt_op: string;
      project: string | null;
      tabellen: TabelControle[];
      opslag: OpslagBucket[];
      waarschuwingen: string[];
    }
  | { ok: false; fouten: string[] };

function isObject(w: unknown): w is Record<string, unknown> {
  return !!w && typeof w === "object" && !Array.isArray(w);
}

/**
 * Controleert de structuur van een back-up: formaat en versie, het manifest, of
 * het aantal rijen per tabel klopt met het manifest en of elke rij de
 * sleutelkolommen heeft. Ontbrekende of onbekende tabellen zijn waarschuwingen.
 */
export function controleerBackup(data: unknown): BackupControle {
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];
  if (!isObject(data)) return { ok: false, fouten: ["Dit is geen back-upbestand (geen JSON-object)."] };
  if (data.formaat !== BACKUP_FORMAAT) {
    return { ok: false, fouten: [`Onbekend formaat: verwacht "${BACKUP_FORMAAT}".`] };
  }
  if (data.versie !== BACKUP_VERSIE) fouten.push(`Onbekende versie ${String(data.versie)} (verwacht ${BACKUP_VERSIE}).`);
  const tabellen = data.tabellen;
  const manifest = data.manifest;
  if (!isObject(tabellen)) fouten.push("Het onderdeel 'tabellen' ontbreekt.");
  if (!isObject(manifest) || !Array.isArray(manifest.tabellen)) {
    fouten.push("Het manifest ontbreekt of is onvolledig (is het downloaden afgebroken?).");
  }
  if (fouten.length || !isObject(tabellen) || !isObject(manifest) || !Array.isArray(manifest.tabellen)) {
    return { ok: false, fouten };
  }

  const perNaam = new Map<string, ManifestTabel>();
  for (const m of manifest.tabellen as unknown[]) {
    if (!isObject(m) || typeof m.naam !== "string" || typeof m.aantal !== "number" || !Array.isArray(m.sleutel)) {
      fouten.push("Het manifest bevat een ongeldige tabelregel.");
      continue;
    }
    perNaam.set(m.naam, m as unknown as ManifestTabel);
    if (typeof m.fout === "string") waarschuwingen.push(`Tabel ${m.naam} kon bij het maken niet worden gelezen: ${m.fout}`);
  }

  const controle: TabelControle[] = [];
  for (const [naam, rijen] of Object.entries(tabellen)) {
    const m = perNaam.get(naam);
    if (!Array.isArray(rijen)) {
      fouten.push(`Tabel ${naam} is geen lijst met rijen.`);
      continue;
    }
    if (!m) {
      fouten.push(`Tabel ${naam} staat niet in het manifest.`);
      continue;
    }
    if (m.aantal !== rijen.length) {
      fouten.push(`Tabel ${naam}: ${rijen.length} rijen in het bestand, maar ${m.aantal} volgens het manifest.`);
    }
    const zonderSleutel = rijen.filter((r) => !isObject(r) || m.sleutel.some((k) => r[k] === undefined || r[k] === null));
    if (zonderSleutel.length) {
      fouten.push(`Tabel ${naam}: ${zonderSleutel.length} rij(en) zonder geldige sleutel (${m.sleutel.join(", ")}).`);
    }
    controle.push({ naam, inBestand: rijen.length, volgensManifest: m.aantal });
  }
  for (const naam of perNaam.keys()) {
    if (!(naam in tabellen)) fouten.push(`Tabel ${naam} staat in het manifest, maar ontbreekt in het bestand.`);
  }
  const bekend = new Set(BACKUP_TABELLEN.map((t) => t.naam));
  for (const t of BACKUP_TABELLEN) {
    if (!perNaam.has(t.naam)) waarschuwingen.push(`Tabel ${t.naam} zit niet in deze back-up (ouder formaat?).`);
  }
  for (const naam of perNaam.keys()) {
    if (!bekend.has(naam)) waarschuwingen.push(`Tabel ${naam} is onbekend in deze versie van de site.`);
  }

  if (fouten.length) return { ok: false, fouten };
  const opslag = isObject(manifest.opslag) && Array.isArray(manifest.opslag.buckets) ? manifest.opslag.buckets : [];
  return {
    ok: true,
    gemaakt_op: typeof manifest.gemaakt_op === "string" ? manifest.gemaakt_op : String(data.gemaakt_op ?? ""),
    project: typeof manifest.project === "string" ? manifest.project : null,
    tabellen: controle,
    opslag: opslag as OpslagBucket[],
    waarschuwingen,
  };
}

/** Of de eerste bytes gzip zijn (1f 8b). */
export function isGzip(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
}

/** "512 B", "34 kB", "12,3 MB". */
export function leesbareGrootte(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024).toLocaleString("nl-NL")} kB`;
  return `${(bytes / 1024 / 1024).toLocaleString("nl-NL", { maximumFractionDigits: 1 })} MB`;
}
