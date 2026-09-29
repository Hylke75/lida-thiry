// Import-functie (Fase 2): leest per adviestype het Markdown-bestand in en schrijft
// adviestypes + adviessecties naar Supabase. Idempotent (upsert + secties vervangen).
//
// Gebruik:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/importeer-adviestypes.mjs 2X 6A 8V
//   node scripts/importeer-adviestypes.mjs alle
//
// De service-role-sleutel is alleen server-side en staat NOOIT in de repo.
// Bronmap standaard: ~/Desktop/figuurtypes-advies-md (te overschrijven met BRONMAP).

import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

// Laadt sleutels uit .env.local (nooit in de repo). Waarden worden niet gelogd.
function laadEnvLokaal() {
  const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const pad = join(projectRoot, ".env.local");
  if (!existsSync(pad)) return;
  for (const regel of readFileSync(pad, "utf8").split(/\r?\n/)) {
    const m = regel.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
laadEnvLokaal();

const BRONMAP =
  process.env.BRONMAP || join(homedir(), "Desktop", "figuurtypes-advies-md");

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
// Accepteert zowel de legacy service_role-JWT als de moderne sb_secret_-sleutel.
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Ontbrekend: zet SUPABASE_SERVICE_ROLE_KEY (of SUPABASE_SECRET_KEY) in .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Vaste sectie-opbouw (genormaliseerd: kleine letters, zonder dubbele punt).
const SECTIES = new Set([
  "je hebt", "je kledingplan", "je schouders", "je bovenlichaam",
  "je taille en middenrif", "je onderlichaam", "je kleuren en dessins",
  "je sieraden", "je sjaals", "je riemen en ceintuurs", "je schoenen",
  "je tassen", "je broeken", "je rokken", "je tops", "je jasjes en mantels",
  "je jurken", "tips", "voorbeeldoutfits", "je voorbeeldoutfits",
]);

const FIGUURNAAM = {
  X: "De zandloper",
  A: "De peer (driehoek)",
  V: "De omgekeerde driehoek",
  H: "De rechthoek",
  "8": null, // OPEN: figuurnaam van de 8 nog te bevestigen
};

function lengteLabel(categorie) {
  if (categorie <= 4) return "kort";
  if (categorie <= 8) return "gemiddeld";
  return "lang";
}
function maatLabel(categorie) {
  return ["tenger", "gemiddeld", "vol", "plus"][(categorie - 1) % 4];
}

function normaliseerKop(regel) {
  const m = regel.trim().match(/^\*\*(.+?)\*\*:?\s*$/);
  if (!m) return null;
  return m[1].trim().replace(/:$/, "").trim().toLowerCase();
}
function kopTekst(regel) {
  return regel.trim().match(/^\*\*(.+?)\*\*:?\s*$/)[1].trim().replace(/:$/, "");
}

function haalAfbeeldingen(tekst) {
  const namen = [];
  for (const m of tekst.matchAll(/src="([^"]+)"/g)) namen.push(basisnaam(m[1]));
  for (const m of tekst.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)) namen.push(basisnaam(m[1]));
  return [...new Set(namen)];
}
function basisnaam(pad) {
  return pad.split("/").pop();
}
function stripFiguren(tekst) {
  return tekst
    .replace(/<figure>[\s\S]*?<\/figure>/g, "")
    .replace(/<img[^>]*\/?>/g, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseSecties(mdPad) {
  const regels = readFileSync(mdPad, "utf8").split(/\r?\n/);
  const secties = [];
  let huidige = null;
  for (const regel of regels) {
    const kop = normaliseerKop(regel);
    if (kop && SECTIES.has(kop)) {
      huidige = { kop: kopTekst(regel), regels: [] };
      secties.push(huidige);
    } else if (huidige) {
      huidige.regels.push(regel);
    }
  }
  return secties.map((s) => {
    const ruw = s.regels.join("\n");
    return { kop: s.kop, tekst: stripFiguren(ruw), afbeeldingen: haalAfbeeldingen(ruw) };
  });
}

function metaVanSleutel(sleutel) {
  const m = sleutel.match(/^(\d+)([XAVH8])$/);
  if (!m) return null;
  const categorie = Number(m[1]);
  const letter = m[2];
  const naam = FIGUURNAAM[letter];
  const lengteOmschrijving = {
    kort: "korte lengte",
    gemiddeld: "gemiddelde lengte",
    lang: "lange lengte",
  }[lengteLabel(categorie)];
  const maatOmschrijving = {
    tenger: "tenger postuur",
    gemiddeld: "gemiddelde maat",
    vol: "volle maat",
    plus: "plus size",
  }[maatLabel(categorie)];
  const titel = [sleutel, naam, `${lengteOmschrijving}, ${maatOmschrijving}`]
    .filter(Boolean)
    .join(" · ");
  return { categorie, letter, titel, lengte_label: lengteLabel(categorie), maat_label: maatLabel(categorie) };
}

const BEELD_BUCKET = "advies-beelden";
const BRON_EXT = new Set([".png", ".jpg", ".jpeg"]);
// Beelden worden verkleind naar deze breedte en als JPEG opgeslagen: veel kleiner
// en sneller in de PDF (bron is vaak >1 MB, in de PDF ~96pt breed).
const MAX_BREEDTE = 480;
const JPEG_KWALITEIT = 72;

// Verkleint de png/jpg-beelden van een type, uploadt ze als JPEG naar de bucket en
// vervangt in de secties de bestandsnamen door hun storage-pad. TIFF e.d. overgeslagen.
async function uploadEnHerkoppelBeelden(sleutel, typeMap, secties) {
  const mediaMap = join(typeMap, "media", "media");
  if (!existsSync(mediaMap)) {
    for (const s of secties) s.afbeeldingen = [];
    return 0;
  }
  const cache = new Map();
  let aantal = 0;
  for (const s of secties) {
    const nieuw = [];
    for (const naam of s.afbeeldingen) {
      const ext = (naam.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase();
      if (!BRON_EXT.has(ext)) continue;
      if (cache.has(naam)) {
        if (cache.get(naam)) nieuw.push(cache.get(naam));
        continue;
      }
      const bestand = join(mediaMap, naam);
      if (!existsSync(bestand)) {
        cache.set(naam, null);
        continue;
      }
      const pad = `${sleutel}/${naam.replace(/\.[a-z0-9]+$/i, ".jpg")}`;
      let buffer;
      try {
        buffer = await sharp(readFileSync(bestand))
          .resize({ width: MAX_BREEDTE, withoutEnlargement: true })
          .flatten({ background: "#ffffff" })
          .jpeg({ quality: JPEG_KWALITEIT })
          .toBuffer();
      } catch {
        cache.set(naam, null);
        continue;
      }
      const { error } = await supabase.storage
        .from(BEELD_BUCKET)
        .upload(pad, buffer, { contentType: "image/jpeg", upsert: true });
      if (error) {
        cache.set(naam, null);
        continue;
      }
      cache.set(naam, pad);
      nieuw.push(pad);
      aantal++;
    }
    s.afbeeldingen = nieuw;
  }
  return aantal;
}

async function importeerType(sleutel) {
  const map = join(BRONMAP, sleutel);
  const md = join(map, "index.md");
  if (!existsSync(md)) {
    console.warn(`- overslaan ${sleutel}: geen index.md in ${map}`);
    return false;
  }
  const meta = metaVanSleutel(sleutel);
  if (!meta) {
    console.warn(`- overslaan ${sleutel}: kan categorie/letter niet afleiden`);
    return false;
  }
  const secties = parseSecties(md);
  const beelden = await uploadEnHerkoppelBeelden(sleutel, map, secties);

  const { error: e1 } = await supabase.from("adviestypes").upsert({
    sleutel,
    letter: meta.letter,
    categorie: meta.categorie,
    titel: meta.titel,
    lengte_label: meta.lengte_label,
    maat_label: meta.maat_label,
  });
  if (e1) throw new Error(`adviestypes ${sleutel}: ${e1.message}`);

  await supabase.from("adviessecties").delete().eq("type_sleutel", sleutel);
  const rijen = secties.map((s, i) => ({
    type_sleutel: sleutel,
    volgorde: i + 1,
    kop: s.kop,
    tekst: s.tekst,
    afbeeldingen: s.afbeeldingen,
  }));
  if (rijen.length) {
    const { error: e2 } = await supabase.from("adviessecties").insert(rijen);
    if (e2) throw new Error(`adviessecties ${sleutel}: ${e2.message}`);
  }
  console.log(`✓ ${sleutel}: ${rijen.length} secties, ${beelden} beelden geüpload`);
  return true;
}

function alleSleutels() {
  return readdirSync(BRONMAP, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+[XAVH8]$/.test(d.name))
    .map((d) => d.name);
}

async function main() {
  let args = process.argv.slice(2);
  if (args.length === 1 && args[0] === "alle") args = alleSleutels();
  if (args.length === 0) args = ["2X", "6A", "8V"];
  let ok = 0;
  for (const sleutel of args) {
    try {
      if (await importeerType(sleutel)) ok++;
    } catch (e) {
      console.error(`✗ ${sleutel}: ${e.message}`);
    }
  }
  console.log(`\nKlaar: ${ok}/${args.length} types geïmporteerd.`);
}

main();
