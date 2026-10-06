#!/usr/bin/env node
// End-to-end-tests lokaal (en in CI) zonder echte database of geheimen.
//
// Gebruik:
//   npm run e2e:lokaal                     # bouwen, starten, alle specs draaien
//   npm run e2e:lokaal -- --geen-build     # bestaande e2e-build hergebruiken
//   npm run e2e:lokaal -- e2e/publiek.spec.ts --headed   # extra argumenten gaan naar Playwright
//   npm run e2e:lokaal -- --alleen-server  # alleen bouwen en starten (stoppen met Ctrl+C)
//   npm run e2e:lokaal -- --alleen-server --voorbeelddata  # met voorbeeldreviews en -blogberichten
//
// Wat het doet:
//   1. Start een mini-"Supabase" op 127.0.0.1 (zie nepSupabase hieronder). Die
//      kent alleen de gepubliceerde pagina "contact" (zodat het contactformulier
//      getest kan worden) en een prijs (zodat /bestellen het bestelformulier toont),
//      en geeft op al het andere een nette foutmelding. De site
//      valt dan overal terug op zijn standaardteksten, net als bij een storing.
//   2. Bouwt de site (`next build`) met dummywaarden voor alle sleutels. NEXT_PUBLIC_*
//      zitten in de build gebakken; daarom een eigen build met de URL van stap 1.
//      Met --geen-build (of E2E_GEEN_BUILD=1) wordt een eerdere build van dit
//      script hergebruikt, mits die met dezelfde instellingen is gemaakt.
//   3. Start `next start` op poort 3100 (E2E_POORT), wacht tot hij antwoordt.
//   4. Draait `playwright test` met E2E_BASE_URL naar die server.
//   5. Stopt de server en de nep-database, en geeft de exitcode van Playwright door.
//
// Er gaat niets naar buiten: geen e-mail (geen Resend-sleutel), geen betalingen
// (geen Mollie-sleutel), geen echte database.

import { spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const POORT = Number(process.env.E2E_POORT) || 3100;
const DB_POORT = Number(process.env.E2E_DB_POORT) || 54329;
const BASIS = `http://localhost:${POORT}`;
const MARKERING = join(ROOT, ".next", "e2e-lokaal.json");
// Rechtstreeks via node (niet via npx), zodat stoppen ook echt de server stopt.
const NEXT_BIN = join(ROOT, "node_modules", "next", "dist", "bin", "next");
const PLAYWRIGHT_BIN = join(ROOT, "node_modules", "@playwright", "test", "cli.js");

const args = process.argv.slice(2);
const geenBuild = args.includes("--geen-build") || process.env.E2E_GEEN_BUILD === "1";
const alleenServer = args.includes("--alleen-server");
const playwrightArgs = args.filter((a) => !["--geen-build", "--alleen-server", "--voorbeelddata"].includes(a));

/** Dummywaarden: genoeg om te bouwen en te starten, nergens echt geldig. */
const ENV = {
  ...process.env,
  NODE_ENV: "production",
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${DB_POORT}`,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "e2e-service-role-key",
  NEXT_PUBLIC_SITE_URL: BASIS,
  BEHEER_EMAIL: "beheer@example.com",
  CRON_SECRET: "e2e-cron-secret",
  NIEUWSBRIEF_GEHEIM: "e2e-nieuwsbrief-geheim-0123456789abcdef",
  LINK_GEHEIM: "e2e-link-geheim-0123456789abcdef",
};
// Nooit per ongeluk echte diensten aanspreken vanuit een lokale shell met geheimen.
for (const sleutel of ["RESEND_API_KEY", "MOLLIE_API_KEY", "ANTHROPIC_API_KEY", "GRATIS_TEST", "VERCEL_ENV", "VERCEL_URL"]) {
  delete ENV[sleutel];
}

/** Kenmerk van een build van dit script: dezelfde instellingen én dezelfde BUILD_ID. */
function buildKenmerk() {
  const buildId = existsSync(join(ROOT, ".next", "BUILD_ID")) ? readFileSync(join(ROOT, ".next", "BUILD_ID"), "utf8").trim() : null;
  return JSON.stringify({ supabase: ENV.NEXT_PUBLIC_SUPABASE_URL, site: BASIS, buildId, voorbeelddata });
}

// ── Nep-database ─────────────────────────────────────────────────────────────

const CONTACTPAGINA = {
  id: "00000000-0000-4000-8000-00000000c0de",
  slug: "contact",
  titel: "Contact",
  intro: "Heb je een vraag? Stuur me een bericht.",
  inhoud: "{contactformulier}",
  omslag_url: null,
  omslag_alt: "",
  status: "gepubliceerd",
  in_menu: false,
  in_footer: false,
  menu_label: "Contact",
  volgorde: 1,
  seo_titel: "",
  seo_omschrijving: "",
  niet_indexeren: true,
  aangemaakt_op: "2026-01-01T00:00:00Z",
  bijgewerkt_op: "2026-01-01T00:00:00Z",
};

const INSTELLINGEN = [
  { sleutel: "prijs_cent", waarde: "4900" },
  { sleutel: "valuta", waarde: "EUR" },
];

// Voorbeeldgegevens (alleen met --voorbeelddata): reviews en blogberichten, zodat
// alle homepageblokken zichtbaar zijn, bijv. voor schermafbeeldingen van het
// ontwerp. Zonder deze vlag blijven de gewone tests "zonder database" werken.
const voorbeelddata = args.includes("--voorbeelddata") || process.env.E2E_VOORBEELDDATA === "1";

const REVIEWS = [
  {
    id: "00000000-0000-4000-8000-0000000000a1",
    naam: "Marianne de Vries",
    sterren: 5,
    tekst: "Alles viel ineens op zijn plek. Ik snap nu waarom sommige broeken mij wel goed staan en andere juist niet.",
    ingevuld_op: "2026-05-01T10:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-0000000000a2",
    naam: "Sandra",
    sterren: 5,
    tekst: "Ik winkel veel gerichter en heb veel minder miskopen. Dat scheelt geld én onrust.",
    ingevuld_op: "2026-04-01T10:00:00Z",
  },
  {
    id: "00000000-0000-4000-8000-0000000000a3",
    naam: "Monique",
    sterren: 4,
    tekst:
      "Vooral fijn dat het advies niet voelt als regels. Ik weet nu beter hoe ik mijn eigen stijl kan gebruiken, welke lengtes ik kies en waarom een jasje op de heup mij zoveel beter staat dan een lang vest dat ik altijd droeg.",
    ingevuld_op: "2026-03-01T10:00:00Z",
  },
];

const blogBericht = (n, slug, titel, categorie) => ({
  id: `00000000-0000-4000-8000-0000000000b${n}`,
  slug,
  titel,
  samenvatting: "Een voorbeeldbericht voor de lokale e2e-omgeving.",
  inhoud: "Een voorbeeldbericht voor de lokale e2e-omgeving.",
  omslag_url: null,
  omslag_alt: "",
  categorie,
  tags: [],
  status: "gepubliceerd",
  gepubliceerd_op: `2026-0${n}-01T10:00:00Z`,
  seo_titel: "",
  seo_omschrijving: "",
  auteur: "Lida Thiry",
  uitgelicht: false,
  ai_gegenereerd: false,
  aangemaakt_op: `2026-0${n}-01T10:00:00Z`,
  bijgewerkt_op: `2026-0${n}-01T10:00:00Z`,
});

const BLOG = [
  blogBericht(3, "garderobe-stap-voor-stap", "Zo bouw je stap voor stap een garderobe die bij je figuur past", "Stijl"),
  blogBericht(2, "verhouding-boven-trend", "Waarom de juiste verhouding vaak meer doet dan een nieuwe trend", "Figuur"),
  blogBericht(1, "vijf-kleurcombinaties", "Vijf onverwachte kleurcombinaties die vrolijk zijn zonder druk te worden", null),
];

// Eén bericht met rijke opmaak (koppen, lijst, link), alleen op te vragen via zijn
// slug (/blog/kleuren-die-je-laten-stralen): zo blijven de lijsten hierboven gelijk.
const BLOG_RIJK = {
  ...blogBericht(4, "kleuren-die-je-laten-stralen", "Kleuren die je laten stralen: zo vind je ze zelf", "Kleur"),
  samenvatting: "Geen regelsboek, maar een paar eenvoudige proefjes voor de spiegel. Zo ontdek je welke tinten jouw gezicht laten oplichten.",
  inhoud: [
    "Je kent het vast: een trui die in de winkel prachtig is, maar thuis ineens flets oogt. Dat ligt zelden aan de trui. Het zit in de wisselwerking tussen de kleur en jouw huid, haar en ogen.",
    "## Begin bij daglicht",
    "Ga bij een raam staan, zonder make-up, met je haar naar achteren. Houd steeds twee stoffen onder je gezicht en kijk niet naar de stof, maar naar je huid.",
    "- Warme tinten (camel, koraal, olijf) tegenover koele tinten (grijs, framboos, marine)",
    "- Zachte, gedempte kleuren tegenover heldere, pure kleuren",
    "- Licht tegenover donker, vlak bij je gezicht",
    "### Wat zie je?",
    "Een kleur die bij je past laat je huid **egaler en frisser** ogen. Een kleur die niet past, benadrukt schaduwen en kringen. Twijfel je? Lees ook [hoe de juiste verhouding meer doet dan een trend](/blog/verhouding-boven-trend).",
    "## Combineren zonder druk",
    "Kies één kleur die je laat stralen als uitgangspunt en combineer die met rustige basiskleuren. Zo blijft het vrolijk zonder te druk te worden.",
  ].join("\n\n"),
  tags: ["kleur", "basis"],
  gepubliceerd_op: "2026-05-01T10:00:00Z",
};
const BLOG_OP_SLUG = [...BLOG, BLOG_RIJK];

/**
 * Antwoordt als PostgREST/GoTrue, maar kent bijna niets: alleen
 * `paginas?slug=eq.contact` en `instellingen` (een prijs) geven rijen. Al het
 * andere krijgt een 4xx-fout (geen 5xx, zodat de stroomonderbreker van de site
 * niet afgaat en de contactpagina bereikbaar blijft). De leesfuncties vallen dan terug op hun
 * standaardwaarden; inloggen lukt nooit.
 */
function nepSupabase() {
  return createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://db");
    const json = (status, body) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.method === "GET" && url.pathname === "/rest/v1/paginas" && url.searchParams.get("slug") === "eq.contact") {
      const enkel = (req.headers.accept ?? "").includes("vnd.pgrst.object");
      return json(200, enkel ? CONTACTPAGINA : [CONTACTPAGINA]);
    }
    if (req.method === "GET" && url.pathname === "/rest/v1/instellingen") {
      // Een prijs, zodat /bestellen het bestelformulier toont.
      return json(200, INSTELLINGEN);
    }
    if (voorbeelddata && req.method === "GET" && url.pathname === "/rest/v1/beoordelingen") {
      const limiet = Number(url.searchParams.get("limit")) || REVIEWS.length;
      return json(200, REVIEWS.slice(0, limiet));
    }
    if (voorbeelddata && req.method === "GET" && url.pathname === "/rest/v1/blog_berichten") {
      const slug = url.searchParams.get("slug")?.replace(/^eq\./, "");
      const rijen = slug ? BLOG_OP_SLUG.filter((b) => b.slug === slug) : BLOG;
      if ((req.headers.accept ?? "").includes("vnd.pgrst.object")) {
        return rijen[0] ? json(200, rijen[0]) : json(406, { code: "PGRST116", message: "Geen rij" });
      }
      res.setHeader("content-range", rijen.length ? `0-${rijen.length - 1}/${rijen.length}` : "*/0");
      return json(200, rijen);
    }
    if (url.pathname.startsWith("/auth/")) {
      return json(401, { code: 401, error_code: "e2e_geen_database", msg: "Geen database in de e2e-omgeving" });
    }
    json(400, { code: "E2E00", message: "Geen database in de e2e-omgeving", details: null, hint: null });
  });
}

// ── Hulpjes ──────────────────────────────────────────────────────────────────

function draai(cmd, cmdArgs, opties = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, cmdArgs, { cwd: ROOT, env: ENV, stdio: "inherit", ...opties });
    p.on("exit", (code, signaal) => resolve(code ?? (signaal ? 1 : 0)));
  });
}

async function wachtOpServer(url, maxMs = 90_000) {
  const eind = Date.now() + maxMs;
  while (Date.now() < eind) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (res.status < 500) return;
    } catch {
      // nog niet klaar
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server op ${url} niet bereikbaar binnen ${maxMs / 1000} s`);
}

// ── Hoofdprogramma ───────────────────────────────────────────────────────────

const db = nepSupabase();
await new Promise((resolve, reject) => {
  db.once("error", reject);
  db.listen(DB_POORT, "127.0.0.1", resolve);
});
console.log(`e2e: nep-database op http://127.0.0.1:${DB_POORT}`);

let server = null;
let code = 1;
const opruimen = () => {
  if (server && server.exitCode === null) server.kill("SIGTERM");
  db.close();
};
process.on("SIGINT", () => {
  opruimen();
  process.exit(130);
});

try {
  const hergebruik =
    geenBuild && existsSync(MARKERING) && readFileSync(MARKERING, "utf8") === buildKenmerk();
  if (hergebruik) {
    console.log("e2e: bestaande e2e-build hergebruikt (--geen-build)");
  } else {
    if (geenBuild) console.log("e2e: geen bruikbare e2e-build gevonden; toch bouwen");
    console.log("e2e: next build …");
    const buildCode = await draai(process.execPath, [NEXT_BIN, "build"]);
    if (buildCode !== 0) throw new Error(`next build mislukt (exitcode ${buildCode})`);
    writeFileSync(MARKERING, buildKenmerk());
  }

  console.log(`e2e: next start op ${BASIS} …`);
  server = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(POORT)], { cwd: ROOT, env: ENV, stdio: ["ignore", "pipe", "pipe"] });
  // Serverlog alleen tonen als E2E_SERVERLOG=1 (de verwachte databasefouten zijn veel ruis).
  if (process.env.E2E_SERVERLOG === "1") {
    server.stdout.pipe(process.stdout);
    server.stderr.pipe(process.stderr);
  } else {
    server.stdout.resume();
    server.stderr.resume();
  }
  await wachtOpServer(`${BASIS}/robots.txt`);
  if (alleenServer) {
    console.log(`e2e: server klaar op ${BASIS} (Ctrl+C om te stoppen)`);
    await new Promise((resolve) => server.on("exit", resolve));
    throw new Error("server gestopt");
  }
  console.log("e2e: server klaar; playwright test …");

  code = await draai(process.execPath, [PLAYWRIGHT_BIN, "test", ...playwrightArgs], {
    env: { ...ENV, NODE_ENV: "test", E2E_BASE_URL: BASIS, E2E_LOKAAL: "1" },
  });
} catch (e) {
  console.error(`e2e: ${e instanceof Error ? e.message : e}`);
  code = 1;
} finally {
  opruimen();
}
process.exit(code);
