"use client";

/* eslint-disable @next/next/no-img-element -- tijdelijke (signed) URLs uit de beeldbank */
import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Lichaam } from "@/components/Lichaam";
import { STANDAARD_VORM, VORM_GRENZEN, type Lichaamstype } from "@/lib/lichaamstype-regels";
import type { Lichaamsvorm } from "@/lib/test-config";
import { maakLichaamstype, slaLichaamstypeOp, zoekFotos, type FotoKeuze, type Status } from "./acties";
import { invoerBreed, kaart, kaartVlak, knop, label, tekstUitleg, toon } from "@/components/admin/stijl";

const VORM_VELDEN: { sleutel: keyof Lichaamsvorm; label: string }[] = [
  { sleutel: "schouder", label: "Schouders" },
  { sleutel: "borst", label: "Borst" },
  { sleutel: "taille", label: "Taille" },
  { sleutel: "hogeHeup", label: "Hoge heup" },
  { sleutel: "heup", label: "Heupen" },
];

export function LichaamstypeFormulier({
  type,
  foto,
  bronnen,
}: {
  /** Bestaand type; leeg = nieuw type. */
  type?: Lichaamstype;
  /** Huidige foto (indien gekoppeld). */
  foto?: FotoKeuze | null;
  /** Bestaande types om de inhoud van over te nemen (alleen bij nieuw). */
  bronnen?: { code: string; naam: string }[];
}) {
  const nieuw = !type;
  const [status, actie, bezig] = useActionState<Status | null, FormData>(
    nieuw ? maakLichaamstype : slaLichaamstypeOp,
    null,
  );
  const [vorm, setVorm] = useState<Lichaamsvorm>(type?.vorm ?? STANDAARD_VORM);
  const [gekozenFoto, setGekozenFoto] = useState<FotoKeuze | null>(foto ?? null);
  const [naam, setNaam] = useState(type?.naam ?? "");

  return (
    <form action={actie} className="flex flex-col gap-6">
      {!nieuw && <input type="hidden" name="code" value={type.code} />}
      <input type="hidden" name="beeld_id" value={gekozenFoto?.id ?? ""} />

      <section className={`${kaartVlak} grid gap-4 sm:grid-cols-2`}>
        <h2 className="text-lg font-semibold sm:col-span-2">Naam en omschrijving</h2>
        {nieuw ? (
          <label className={label}>
            Code
            <input
              name="code"
              required
              maxLength={3}
              pattern="[A-Za-z]{1,3}"
              placeholder="bijv. Y"
              className={`${invoerBreed} uppercase`}
            />
            <span className={tekstUitleg}>
              1 tot 3 letters. De code komt in de typecodes (bijv. 6Y) en kan later niet meer worden gewijzigd.
            </span>
          </label>
        ) : (
          <div className={label}>
            Code
            <p className="rounded-lg bg-accent-zacht px-3 py-2 font-mono">{type.code}</p>
            <span className={tekstUitleg}>Vast: hoort bij de typecodes 1{type.code} t/m 12{type.code}.</span>
          </div>
        )}
        <label className={label}>
          Naam
          <input name="naam" required value={naam} onChange={(e) => setNaam(e.target.value)} className={invoerBreed} />
          <span className={tekstUitleg}>Zoals de klant het ziet, bijv. &ldquo;Zandloper&rdquo;.</span>
        </label>
        <label className={label}>
          Ook wel genoemd
          <input name="alias" defaultValue={type?.alias ?? ""} placeholder="bijv. de Driehoek of de Peer" className={invoerBreed} />
          <span className={tekstUitleg}>Wordt gebruikt in zinnen als &ldquo;Je hebt het A-silhouet, ook wel …&rdquo;.</span>
        </label>
        <label className={label}>
          Volgorde
          <input name="volgorde" type="number" min={0} defaultValue={type?.volgorde ?? ""} className={invoerBreed} />
          <span className={tekstUitleg}>Bepaalt de volgorde in de test, op de website en in de lijsten.</span>
        </label>
        <label className={`${label} sm:col-span-2`}>
          Korte omschrijving
          <input
            name="korte_omschrijving"
            maxLength={160}
            defaultValue={type?.korte_omschrijving ?? ""}
            placeholder="bijv. Schouders en heupen in balans, duidelijke taille."
            className={invoerBreed}
          />
          <span className={tekstUitleg}>Eén zin onder het silhouet bij de keuze in de test en op de website.</span>
        </label>
        <label className={`${label} sm:col-span-2`}>
          Uitleg bij de uitslag
          <textarea name="uitleg" rows={5} defaultValue={type?.uitleg ?? ""} className={`${invoerBreed} leading-relaxed`} />
          <span className={tekstUitleg}>2–3 zinnen: wat betekent dit figuur voor je kleding. Staat op het uitslagscherm en het PDF-voorblad.</span>
        </label>
        <label className={`${label} sm:col-span-2`}>
          Kenmerken
          <textarea
            name="kenmerken"
            rows={5}
            defaultValue={type?.kenmerken ?? ""}
            placeholder={"- heupen die breder zijn dan je borstomvang\n- een smalle taille"}
            className={`${invoerBreed} font-mono text-sm leading-relaxed`}
          />
          <span className={tekstUitleg}>Herkenbare kenmerken van dit figuur, één per regel beginnend met &ldquo;- &rdquo;.</span>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
          <input type="checkbox" name="actief" defaultChecked={type?.actief ?? true} className="h-4 w-4 accent-[var(--accent)]" />
          Actief: kiesbaar in de test en zichtbaar op de website
        </label>
      </section>

      <section className={`${kaartVlak} grid gap-5 sm:grid-cols-[1fr_200px]`}>
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Tekening van het silhouet</h2>
          <p className={tekstUitleg}>
            Met de schuifjes bepaal je de verhoudingen van de getekende figuur (gebruikt als er geen foto is gekoppeld en op
            het PDF-voorblad).
          </p>
          {VORM_VELDEN.map((v) => (
            <label key={v.sleutel} className="grid grid-cols-[100px_1fr_40px] items-center gap-3 text-sm">
              {v.label}
              <input
                type="range"
                name={`vorm_${v.sleutel}`}
                min={VORM_GRENZEN.min}
                max={VORM_GRENZEN.max}
                value={vorm[v.sleutel]}
                onChange={(e) => setVorm((x) => ({ ...x, [v.sleutel]: Number(e.target.value) }))}
                className="accent-[var(--accent)]"
              />
              <span className="text-right tabular-nums text-foreground/70">{vorm[v.sleutel]}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-center rounded-2xl bg-accent-zacht p-4 text-accent">
          <Lichaam vorm={vorm} armen={false} titel={`Voorbeeld: ${naam || "nieuw lichaamstype"}`} className="h-64" />
        </div>
      </section>

      <FotoKiezer gekozen={gekozenFoto} kies={setGekozenFoto} />

      {nieuw && bronnen && bronnen.length > 0 && (
        <section className={`${kaartVlak} flex flex-col gap-2`}>
          <h2 className="text-lg font-semibold">Startinhoud van de hand-outs</h2>
          <p className={tekstUitleg}>
            Er worden automatisch 12 adviestypes aangemaakt (één per categorie lengte/gewicht). Kies een bestaand type om de
            teksten en beelden daarvan als startpunt over te nemen, of begin leeg.
          </p>
          <select name="bron_code" defaultValue="" className={invoerBreed}>
            <option value="">Leeg beginnen</option>
            {bronnen.map((b) => (
              <option key={b.code} value={b.code}>
                Inhoud overnemen van {b.code} · {b.naam}
              </option>
            ))}
          </select>
        </section>
      )}

      {status && (
        <p
          role={status.ok ? "status" : "alert"}
          className={`rounded-lg px-4 py-3 text-sm ${
            status.ok
              ? toon.groen
              : toon.rood
          }`}
        >
          {status.melding}
        </p>
      )}
      <div>
        <button
          disabled={bezig}
          className={knop}
        >
          {bezig ? "Bezig…" : nieuw ? "Lichaamstype aanmaken" : "Opslaan"}
        </button>
      </div>
    </form>
  );
}

function FotoKiezer({ gekozen, kies }: { gekozen: FotoKeuze | null; kies: (f: FotoKeuze | null) => void }) {
  const [open, setOpen] = useState(false);
  const [zoek, setZoek] = useState("");
  const [resultaten, setResultaten] = useState<FotoKeuze[]>([]);
  const [bezig, start] = useTransition();

  const zoekNu = (term: string) => start(async () => setResultaten(await zoekFotos(term)));

  return (
    <section className={kaart}>
      <h2 className="text-lg font-semibold">Foto of illustratie (optioneel)</h2>
      <p className={tekstUitleg}>
        Kies een beeld uit de beeldbank. Het verschijnt in plaats van de tekening bij de keuze in de test en op het
        uitslagscherm. Een nieuw beeld voeg je eerst toe in de{" "}
        <Link href="/admin/beeldbank" target="_blank" className="text-accent underline underline-offset-2">
          beeldbank
        </Link>
        .
      </p>
      <div className="flex flex-wrap items-center gap-4">
        {gekozen ? (
          <div className="flex items-center gap-3">
            <div className="flex h-28 w-20 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/10">
              {gekozen.url && <img src={gekozen.url} alt={gekozen.naam ?? gekozen.code} className="max-h-full max-w-full object-contain" />}
            </div>
            <div className="text-sm">
              <p className="font-medium">{gekozen.code}</p>
              <p className="text-foreground/70">{gekozen.naam ?? gekozen.omschrijving ?? ""}</p>
              <button type="button" onClick={() => kies(null)} className="mt-1 text-xs text-red-700 underline dark:text-red-300">
                Foto loskoppelen (tekening gebruiken)
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground/70">Geen foto gekoppeld: de tekening wordt gebruikt.</p>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen((o) => !o);
            if (!open && resultaten.length === 0) zoekNu("");
          }}
          className="rounded-full border border-black/15 px-4 py-1.5 text-sm hover:border-accent hover:text-accent dark:border-white/20"
        >
          {open ? "Sluiten" : gekozen ? "Andere foto kiezen" : "Foto kiezen"}
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-3 rounded-xl bg-background p-3">
          <div className="flex gap-2">
            <input
              value={zoek}
              onChange={(e) => setZoek(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  zoekNu(zoek);
                }
              }}
              placeholder="Zoek op code, naam of omschrijving (leeg = silhouetten)"
              className={invoerBreed}
            />
            <button
              type="button"
              onClick={() => zoekNu(zoek)}
              className="rounded-full bg-foreground px-4 text-sm text-background"
            >
              Zoeken
            </button>
          </div>
          {bezig ? (
            <p className="text-sm text-foreground/70">Zoeken…</p>
          ) : resultaten.length === 0 ? (
            <p className="text-sm text-foreground/70">Niets gevonden.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {resultaten.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    kies(r);
                    setOpen(false);
                  }}
                  className={`flex flex-col items-center gap-1 rounded-lg border-2 p-1.5 text-xs hover:border-accent ${
                    gekozen?.id === r.id ? "border-accent" : "border-transparent"
                  }`}
                >
                  <span className="flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded bg-white">
                    {r.url && <img src={r.url} alt={r.naam ?? r.code} className="max-h-full max-w-full object-contain" />}
                  </span>
                  {r.code}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
