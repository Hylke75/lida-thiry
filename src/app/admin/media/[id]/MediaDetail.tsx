"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatAfmetingen,
  formatGrootte,
  GEBRUIK_LABEL,
  MAP_SUGGESTIES,
  normaliseerMap,
  opmaakFragment,
  type Gebruik,
  type MediaItem,
} from "@/lib/media/regels";
import { toonDatumTijd } from "@/lib/nieuwsbrief/tijd";
import { Melding } from "../../Melding";
import { invoerKlasse, kaart, knopHoofd, knopKlein, knopRand, zacht } from "../../nieuwsbrief/_editor/stijl";
import { verwijderMediaBestand, werkMediaGegevensBij } from "../acties";

function KopieerKnop({ tekst, label }: { tekst: string; label: string }) {
  const [klaar, setKlaar] = useState(false);
  async function kopieer() {
    try {
      await navigator.clipboard.writeText(tekst);
      setKlaar(true);
      window.setTimeout(() => setKlaar(false), 2000);
    } catch {
      window.prompt("Kopieer:", tekst);
    }
  }
  return (
    <button type="button" onClick={kopieer} className={knopKlein}>
      <span aria-live="polite">{klaar ? "✓ Gekopieerd" : label}</span>
    </button>
  );
}

export function MediaDetail({ media, gebruik, mappen }: { media: MediaItem; gebruik: Gebruik[] | null; mappen: string[] }) {
  const router = useRouter();
  const id = useId();
  const [naam, setNaam] = useState(media.naam);
  const [alt, setAlt] = useState(media.alt);
  const [map, setMap] = useState(media.map);
  const [bezig, setBezig] = useState<null | "opslaan" | "verwijderen">(null);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string } | null>(null);
  const [bevestig, setBevestig] = useState(false);
  const [toch, setToch] = useState(false);
  const [gebruikNu, setGebruikNu] = useState<Gebruik[] | null>(gebruik);

  const gewijzigd = naam !== media.naam || alt !== media.alt || map !== media.map;
  const afm = formatAfmetingen(media.breedte, media.hoogte);
  const inGebruik = (gebruikNu?.length ?? 0) > 0;

  async function opslaan(e: React.FormEvent) {
    e.preventDefault();
    if (!normaliseerMap(map)) return setMelding({ soort: "fout", tekst: "Geef een map op (letters, cijfers en streepjes)." });
    setBezig("opslaan");
    setMelding(null);
    try {
      const r = await werkMediaGegevensBij(media.id, { naam, alt, map });
      if (!r.ok) return setMelding({ soort: "fout", tekst: r.fout });
      setNaam(r.media.naam);
      setAlt(r.media.alt);
      setMap(r.media.map);
      setMelding({ soort: "ok", tekst: "Opgeslagen." });
      router.refresh();
    } catch {
      setMelding({ soort: "fout", tekst: "Opslaan is niet gelukt. Controleer je internetverbinding." });
    } finally {
      setBezig(null);
    }
  }

  async function verwijder() {
    setBezig("verwijderen");
    setMelding(null);
    try {
      const r = await verwijderMediaBestand(media.id, toch);
      if (r.ok) {
        router.push("/admin/media?verwijderd=1");
        router.refresh();
        return;
      }
      if (r.gebruik) setGebruikNu(r.gebruik);
      setMelding({ soort: "fout", tekst: r.fout });
    } catch {
      setMelding({ soort: "fout", tekst: "Verwijderen is niet gelukt. Controleer je internetverbinding." });
    } finally {
      setBezig(null);
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <section className={kaart}>
        <div className="flex max-h-[70vh] min-h-40 items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#0000000d_0%_25%,transparent_0%_50%)] bg-[length:16px_16px]">
          {/* eslint-disable-next-line @next/next/no-img-element -- afbeelding uit de opslag, elk formaat */}
          <img src={media.url} alt={media.alt} className="max-h-[70vh] max-w-full object-contain" />
        </div>
        <dl className={`grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm ${zacht}`}>
          <dt>Type</dt>
          <dd className="break-all">{media.mime}</dd>
          <dt>Grootte</dt>
          <dd>{formatGrootte(media.grootte)}</dd>
          {afm && (
            <>
              <dt>Afmetingen</dt>
              <dd>{afm} px</dd>
            </>
          )}
          <dt>Geüpload</dt>
          <dd>{toonDatumTijd(media.aangemaakt_op)}</dd>
          <dt>Opslag</dt>
          <dd className="break-all">
            {media.bucket}/{media.pad}
          </dd>
        </dl>
        <div className="flex flex-col gap-2">
          <label htmlFor={`${id}-url`} className="text-xs font-medium text-black/70 dark:text-white/70">
            Adres (URL)
          </label>
          <input id={`${id}-url`} readOnly value={media.url} onFocus={(e) => e.target.select()} className={`${invoerKlasse} font-mono text-xs`} />
          <div className="flex flex-wrap gap-1.5">
            <KopieerKnop tekst={media.url} label="Kopieer URL" />
            <KopieerKnop tekst={opmaakFragment(media.url, alt)} label="Kopieer opmaak ![…](…)" />
            <a href={media.url} target="_blank" rel="noopener noreferrer" className={knopKlein}>
              Openen ↗
            </a>
          </div>
        </div>
      </section>

      <div className="flex min-w-0 flex-col gap-6">
        <form onSubmit={opslaan} className={kaart}>
          <h1 className="text-lg font-semibold">Gegevens</h1>
          {melding && <Melding soort={melding.soort}>{melding.tekst}</Melding>}
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-alt`} className="text-xs font-medium text-black/70 dark:text-white/70">
              Omschrijving (alt-tekst)
            </label>
            <textarea id={`${id}-alt`} value={alt} maxLength={300} rows={3} onChange={(e) => setAlt(e.target.value)} className={invoerKlasse} />
            <p className={`text-xs ${zacht}`}>Kort beschrijven wat er te zien is. Wordt standaard ingevuld als je de afbeelding kiest in een editor.</p>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-naam`} className="text-xs font-medium text-black/70 dark:text-white/70">
              Naam
            </label>
            <input id={`${id}-naam`} value={naam} maxLength={120} onChange={(e) => setNaam(e.target.value)} className={invoerKlasse} />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${id}-map`} className="text-xs font-medium text-black/70 dark:text-white/70">
              Map
            </label>
            <input id={`${id}-map`} list={`${id}-mappen`} value={map} onChange={(e) => setMap(e.target.value)} className={invoerKlasse} />
            <datalist id={`${id}-mappen`}>
              {[...new Set([...MAP_SUGGESTIES, ...mappen])].map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            <p className={`text-xs ${zacht}`}>Alleen om te ordenen; het adres van de afbeelding verandert niet.</p>
          </div>
          <button className={`${knopHoofd} w-fit`} disabled={!gewijzigd || bezig !== null}>
            {bezig === "opslaan" ? "Opslaan…" : "Opslaan"}
          </button>
        </form>

        <section className={kaart} aria-labelledby={`${id}-gebruik`}>
          <h2 id={`${id}-gebruik`} className="text-lg font-semibold">
            Gebruikt in
          </h2>
          {gebruikNu === null ? (
            <p className={`text-sm ${zacht}`}>Onbekend.</p>
          ) : gebruikNu.length === 0 ? (
            <p className={`text-sm ${zacht}`}>Nergens gevonden in pagina&apos;s, blogberichten, nieuwsbrieven of website-instellingen.</p>
          ) : (
            <ul className="flex flex-col gap-1.5 text-sm">
              {gebruikNu.map((g) => (
                <li key={g.href} className="flex min-w-0 items-baseline gap-2">
                  <span className={`shrink-0 text-xs ${zacht}`}>{GEBRUIK_LABEL[g.soort]}</span>
                  <Link href={g.href} className="truncate hover:text-accent hover:underline">
                    {g.titel}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className={`text-xs ${zacht}`}>Alleen het beheer wordt doorzocht; links van andere websites of oude e-mails in inboxen zien we niet.</p>
        </section>

        <section className={`${kaart} border-red-200 dark:border-red-900/50`} aria-labelledby={`${id}-weg`}>
          <h2 id={`${id}-weg`} className="text-lg font-semibold">
            Verwijderen
          </h2>
          {!bevestig ? (
            <button type="button" onClick={() => setBevestig(true)} className={`${knopRand} w-fit text-red-700 dark:text-red-300`}>
              Afbeelding verwijderen…
            </button>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                {inGebruik
                  ? `Let op: deze afbeelding wordt nog op ${gebruikNu!.length} plek${gebruikNu!.length === 1 ? "" : "ken"} gebruikt. Daar verschijnt dan een kapotte afbeelding.`
                  : "De afbeelding wordt definitief uit de opslag verwijderd. Dit kan niet ongedaan worden gemaakt."}
              </p>
              {inGebruik && (
                <label className="flex items-start gap-2 text-sm">
                  <input type="checkbox" checked={toch} onChange={(e) => setToch(e.target.checked)} className="mt-0.5 size-4 accent-red-600" />
                  <span>Ik begrijp het, toch verwijderen</span>
                </label>
              )}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={verwijder}
                  disabled={bezig !== null || (inGebruik && !toch)}
                  className="rounded-full bg-red-600 px-5 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
                >
                  {bezig === "verwijderen" ? "Verwijderen…" : "Definitief verwijderen"}
                </button>
                <button type="button" onClick={() => setBevestig(false)} className={knopRand}>
                  Annuleren
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
