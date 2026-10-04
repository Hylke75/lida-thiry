"use client";

import { useEffect, useState, useTransition } from "react";
import { Melding } from "../Melding";
import { AfbeeldingVeld } from "./AfbeeldingVeld";
import { slaWebsiteOp } from "./acties";
import { SocialIcoon } from "@/components/SocialIconen";
import {
  ADVIES_OMSCHRIJVING,
  MAX_NAAM,
  MAX_OMSCHRIJVING,
  SOCIAL_NETWERKEN,
  STANDAARD_SITE,
  valideerAfbeeldingUrl,
  valideerSocialUrl,
  type WebsiteSleutel,
} from "@/lib/website/instellingen";

type Waarden = Record<WebsiteSleutel, string>;

const invoerKlasse =
  "w-full rounded-lg border border-black/15 bg-kaart px-3 py-2 outline-none focus:border-accent aria-[invalid=true]:border-red-400 dark:border-white/20";
const kaartKlasse = "flex flex-col gap-5 rounded-2xl border border-black/10 bg-kaart p-5 dark:border-white/15";
const uitlegKlasse = "text-xs leading-relaxed text-black/50 dark:text-white/50";

function inkorten(tekst: string, max: number): string {
  return tekst.length > max ? `${tekst.slice(0, max - 1).trimEnd()}…` : tekst;
}

/** Zoals de site het adres toont, zonder https:// en zonder slash aan het eind. */
function domein(siteUrl: string): string {
  try {
    return new URL(siteUrl).host;
  } catch {
    return siteUrl;
  }
}

export function WebsiteFormulier({ begin, siteUrl }: { begin: Waarden; siteUrl: string }) {
  const [w, setW] = useState<Waarden>(begin);
  const [gewijzigd, setGewijzigd] = useState(false);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string[] } | null>(null);
  const [bezig, start] = useTransition();

  useEffect(() => {
    if (!gewijzigd) return;
    const waarschuw = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [gewijzigd]);

  const zet = (sleutel: WebsiteSleutel, waarde: string) => {
    setW((oud) => ({ ...oud, [sleutel]: waarde }));
    setGewijzigd(true);
    setMelding(null);
  };

  const opslaan = () =>
    start(async () => {
      const r = await slaWebsiteOp(w);
      if (r.ok) {
        setW(r.waarden);
        setGewijzigd(false);
        setMelding({ soort: "ok", tekst: [r.bericht] });
      } else {
        setMelding({ soort: "fout", tekst: r.fouten });
      }
    });

  // Live voorbeeld ---------------------------------------------------------------
  const naam = w.site_naam.trim();
  const korteNaam = naam || STANDAARD_SITE.korteNaam;
  const volledigeNaam = naam || STANDAARD_SITE.volledigeNaam;
  const omschrijving = w.site_omschrijving.trim().replace(/\s+/g, " ") || STANDAARD_SITE.omschrijving;
  const host = domein(siteUrl);
  const beeldFout = (sleutel: WebsiteSleutel, label: string) => {
    const u = valideerAfbeeldingUrl(w[sleutel], label);
    return u.ok ? null : u.fout;
  };
  const geldigBeeld = (sleutel: WebsiteSleutel) => {
    const u = valideerAfbeeldingUrl(w[sleutel]);
    return u.ok ? u.waarde : null;
  };
  const favicon = geldigBeeld("favicon_url") ?? "/icon.svg";
  const deelbeeld = geldigBeeld("deel_afbeelding_url") ?? "/opengraph-image";
  const omsLengte = w.site_omschrijving.trim().length;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        opslaan();
      }}
      className="flex flex-col gap-6"
    >
      {/* Naam en omschrijving ------------------------------------------------------ */}
      <section className={kaartKlasse} aria-labelledby="kop-naam">
        <h2 id="kop-naam" className="text-lg font-semibold">
          Naam en omschrijving
        </h2>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="site_naam" className="text-sm font-medium">
            Naam van de website
          </label>
          <input
            id="site_naam"
            value={w.site_naam}
            maxLength={MAX_NAAM}
            placeholder={STANDAARD_SITE.korteNaam}
            onChange={(e) => zet("site_naam", e.target.value)}
            className={invoerKlasse}
          />
          <p className={uitlegKlasse}>
            Staat bovenaan de site (als er geen logo is), achter elke paginatitel in het tabblad en in zoekresultaten, en in de
            footer. Leeg laten: &lsquo;{STANDAARD_SITE.korteNaam}&rsquo; (en &lsquo;{STANDAARD_SITE.volledigeNaam}&rsquo; in de
            footer en bij delen).
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="site_omschrijving" className="text-sm font-medium">
            Omschrijving voor zoekmachines
          </label>
          <textarea
            id="site_omschrijving"
            value={w.site_omschrijving}
            maxLength={MAX_OMSCHRIJVING}
            rows={3}
            placeholder={STANDAARD_SITE.omschrijving}
            onChange={(e) => zet("site_omschrijving", e.target.value)}
            aria-describedby="site_omschrijving-uitleg"
            className={invoerKlasse}
          />
          <p id="site_omschrijving-uitleg" className={uitlegKlasse}>
            Eén of twee zinnen over wat bezoekers hier vinden. Google toont ongeveer {ADVIES_OMSCHRIJVING.max} tekens.{" "}
            {omsLengte > 0 && (
              <span
                className={
                  omsLengte < ADVIES_OMSCHRIJVING.min || omsLengte > ADVIES_OMSCHRIJVING.max
                    ? "text-amber-700 dark:text-amber-300"
                    : "text-emerald-700 dark:text-emerald-300"
                }
              >
                {omsLengte} tekens
                {omsLengte < ADVIES_OMSCHRIJVING.min
                  ? " — wat kort."
                  : omsLengte > ADVIES_OMSCHRIJVING.max
                    ? " — de rest wordt in zoekresultaten afgekapt."
                    : " — goede lengte."}
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Afbeeldingen ------------------------------------------------------------- */}
      <section className={kaartKlasse} aria-labelledby="kop-beelden">
        <h2 id="kop-beelden" className="text-lg font-semibold">
          Logo, favicon en deelafbeelding
        </h2>
        <AfbeeldingVeld
          id="logo_url"
          label="Logo"
          waarde={w.logo_url}
          onChange={(u) => zet("logo_url", u)}
          fout={beeldFout("logo_url", "Logo")}
          voorbeeldAlt={korteNaam}
          voorbeeldKlasse="h-10 w-auto max-w-[14rem]"
          uitleg={
            <span>
              Vervangt de naam bovenaan de site. Gebruik een liggend logo met transparante achtergrond (PNG of SVG), minstens 80
              pixels hoog. De alternatieve tekst voor schermlezers is de naam van de website (&lsquo;{korteNaam}&rsquo;).
            </span>
          }
        />
        <AfbeeldingVeld
          id="favicon_url"
          soort="icoon"
          label="Favicon (pictogram in het tabblad)"
          waarde={w.favicon_url}
          onChange={(u) => zet("favicon_url", u)}
          fout={beeldFout("favicon_url", "Favicon")}
          voorbeeldKlasse="h-8 w-8"
          uitleg={<span>Vierkant, minstens 512×512 pixels (PNG of SVG). Leeg laten: het standaardpictogram.</span>}
        />
        <AfbeeldingVeld
          id="deel_afbeelding_url"
          soort="foto"
          label="Deelafbeelding (social media)"
          waarde={w.deel_afbeelding_url}
          onChange={(u) => zet("deel_afbeelding_url", u)}
          fout={beeldFout("deel_afbeelding_url", "Deelafbeelding")}
          voorbeeldKlasse="aspect-[1200/630] h-auto w-64 object-cover"
          uitleg={
            <span>
              Verschijnt als iemand een link naar de site deelt (WhatsApp, Facebook, LinkedIn). Aanbevolen formaat:{" "}
              <strong>1200×630 pixels</strong> (JPG of PNG, kleiner dan 5 MB), met de belangrijkste inhoud in het midden. Blogberichten en
              pagina&apos;s met een eigen omslagfoto gebruiken die foto. Leeg laten: de standaardafbeelding in de huisstijl.
            </span>
          }
        />
      </section>

      {/* Social media ------------------------------------------------------------- */}
      <section className={kaartKlasse} aria-labelledby="kop-social">
        <div className="flex flex-col gap-1">
          <h2 id="kop-social" className="text-lg font-semibold">
            Social media
          </h2>
          <p className={uitlegKlasse}>Ingevulde netwerken verschijnen als pictogram in de footer. Laat leeg wat je niet gebruikt.</p>
        </div>
        {SOCIAL_NETWERKEN.map((s) => {
          const u = valideerSocialUrl(s.netwerk, w[s.sleutel]);
          const fout = u.ok ? null : u.fout;
          return (
            <div key={s.sleutel} className="flex flex-col gap-1.5">
              <label htmlFor={s.sleutel} className="flex items-center gap-2 text-sm font-medium">
                <SocialIcoon netwerk={s.netwerk} className="h-4 w-4 text-accent" />
                {s.label}
              </label>
              <input
                id={s.sleutel}
                type="url"
                inputMode="url"
                value={w[s.sleutel]}
                placeholder={s.voorbeeld}
                onChange={(e) => zet(s.sleutel, e.target.value)}
                aria-invalid={fout ? true : undefined}
                aria-describedby={fout ? `${s.sleutel}-fout` : undefined}
                className={invoerKlasse}
              />
              {fout && (
                <p id={`${s.sleutel}-fout`} className="text-xs text-red-700 dark:text-red-300">
                  {fout}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Voorbeelden -------------------------------------------------------------- */}
      <section className={kaartKlasse} aria-labelledby="kop-voorbeeld">
        <div className="flex flex-col gap-1">
          <h2 id="kop-voorbeeld" className="text-lg font-semibold">
            Zo ziet het eruit
          </h2>
          <p className={uitlegKlasse}>
            Een benadering voor de homepage; Google en social media bepalen zelf de precieze weergave. Na het opslaan kan het
            even duren voordat zij de nieuwe gegevens oppikken.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-black/60 dark:text-white/60">In Google</h3>
          <div className="rounded-xl bg-white p-4 font-sans text-[#202124] ring-1 ring-black/10">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f1f3f4] ring-1 ring-black/5">
                {/* eslint-disable-next-line @next/next/no-img-element -- voorbeeld */}
                <img src={favicon} alt="" className="h-[18px] w-[18px] object-contain" />
              </span>
              <span className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm">{volledigeNaam}</span>
                <span className="truncate text-xs text-[#4d5156]">{siteUrl.replace(/\/$/, "")}</span>
              </span>
            </div>
            <p className="mt-2 truncate text-xl text-[#1a0dab]">
              {STANDAARD_SITE.homeTitel} · {korteNaam}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{inkorten(omschrijving, ADVIES_OMSCHRIJVING.max)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-black/60 dark:text-white/60">Bij delen op social media</h3>
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white font-sans text-[#1c1e21] ring-1 ring-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element -- voorbeeld */}
            <img src={deelbeeld} alt="Voorbeeld van de deelafbeelding" className="aspect-[1200/630] w-full bg-[#f0f2f5] object-cover" />
            <div className="flex flex-col gap-0.5 border-t border-black/10 bg-[#f0f2f5] px-3 py-2.5">
              <span className="truncate text-xs uppercase text-[#606770]">{host}</span>
              <span className="truncate font-semibold">
                {STANDAARD_SITE.deelTitel} · {korteNaam}
              </span>
              <span className="line-clamp-1 text-sm text-[#606770]">{omschrijving}</span>
            </div>
          </div>
        </div>
      </section>

      {melding && (
        <Melding soort={melding.soort}>
          {melding.soort === "fout" && <span className="block font-medium">Niet opgeslagen. Controleer het volgende:</span>}
          {melding.tekst.map((t) => (
            <span key={t} className="block">
              {melding.soort === "fout" ? `• ${t}` : t}
            </span>
          ))}
        </Melding>
      )}

      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 bg-background/90 px-1 py-3 backdrop-blur">
        <button
          disabled={bezig}
          className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {bezig ? "Bezig met opslaan…" : "Opslaan"}
        </button>
        {gewijzigd && !bezig && <span className="text-xs text-black/50 dark:text-white/50">Niet-opgeslagen wijzigingen</span>}
      </div>
    </form>
  );
}
