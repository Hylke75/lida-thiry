#!/usr/bin/env node
// Meet de laadtijd van een paar pagina's: vraagt elke URL N keer op (na één
// opwarmverzoek) en toont per URL de p50, p95 en het maximum in milliseconden.
//
// Gebruik:
//   node scripts/meet-snelheid.mjs [basis-url] [aantal] [pad ...]
//   node scripts/meet-snelheid.mjs https://preview.example.vercel.app 20
//   node scripts/meet-snelheid.mjs http://localhost:3000 10 / /blog /privacy
//
// Zonder paden worden de belangrijkste publieke pagina's gemeten. Alleen lezen
// (GET), geen cookies: zo ziet een gewone bezoeker de site. De verzoeken gaan
// na elkaar (niet tegelijk). Elk verzoek heeft een tijdslimiet (standaard 60 s,
// aan te passen met MEET_TIJDSLIMIET_MS); daarna telt het mee met status "timeout".

const STANDAARD_PADEN = ["/", "/blog", "/privacy", "/voorwaarden", "/bestellen", "/cadeaubon", "/afspraak", "/mijn-advies", "/over-mij"];
const TIJDSLIMIET_MS = Number(process.env.MEET_TIJDSLIMIET_MS) || 60_000;

const [basisArg, aantalArg, ...padArgs] = process.argv.slice(2);
const basis = (basisArg || process.env.MEET_BASIS || "http://localhost:3000").replace(/\/$/, "");
const aantal = Math.max(1, Number(aantalArg) || 10);
const paden = padArgs.length ? padArgs : STANDAARD_PADEN;

/** Percentiel (0–100) van een gesorteerde lijst, met de "nearest rank"-methode. */
function percentiel(gesorteerd, p) {
  if (!gesorteerd.length) return NaN;
  const rang = Math.ceil((p / 100) * gesorteerd.length);
  return gesorteerd[Math.min(gesorteerd.length, Math.max(1, rang)) - 1];
}

async function meetEen(url) {
  const start = performance.now();
  try {
    const res = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(TIJDSLIMIET_MS) });
    await res.arrayBuffer();
    return { ms: performance.now() - start, status: String(res.status) };
  } catch (e) {
    const status = e?.name === "TimeoutError" ? "timeout" : "fout";
    return { ms: performance.now() - start, status };
  }
}

const rijen = [];
for (const pad of paden) {
  const url = basis + pad;
  await meetEen(url); // opwarmen (eerste render / cache vullen)
  const tijden = [];
  const statussen = new Map();
  for (let i = 0; i < aantal; i++) {
    const { ms, status } = await meetEen(url);
    tijden.push(ms);
    statussen.set(status, (statussen.get(status) ?? 0) + 1);
  }
  tijden.sort((a, b) => a - b);
  rijen.push({
    pad,
    p50: Math.round(percentiel(tijden, 50)),
    p95: Math.round(percentiel(tijden, 95)),
    max: Math.round(tijden[tijden.length - 1]),
    status: [...statussen].map(([s, n]) => `${s}×${n}`).join(" "),
  });
}

const breedte = Math.max(4, ...rijen.map((r) => r.pad.length));
console.log(`Basis: ${basis} — ${aantal} verzoeken per pad (na 1 opwarmverzoek)\n`);
console.log(`${"pad".padEnd(breedte)}  ${"p50".padStart(7)}  ${"p95".padStart(7)}  ${"max".padStart(7)}  status`);
for (const r of rijen) {
  console.log(`${r.pad.padEnd(breedte)}  ${String(r.p50).padStart(5)}ms  ${String(r.p95).padStart(5)}ms  ${String(r.max).padStart(5)}ms  ${r.status}`);
}
