"use client";

import Link from "next/link";
import { useEffect, useState, useTransition, type ReactNode } from "react";
import { Melding } from "../Melding";
import { AfbeeldingVeld } from "./AfbeeldingVeld";
import { slaWebsiteOp } from "./acties";
import { SocialIcoon } from "@/components/SocialIconen";
import {
  ADVIES_OMSCHRIJVING,
  BEDRIJF_TYPES,
  MAX_TITEL,
  MAX_WERKGEBIED,
  MAX_NAAM,
  MAX_OMSCHRIJVING,
  SOCIAL_NETWERKEN,
  STANDAARD_SITE,
  valideerAfbeeldingUrl,
  valideerSocialUrl,
  valideerTelefoon,
  type WebsiteSleutel,
} from "@/lib/website/instellingen";
import { invoerBreed, kaart, knop, tekstFout, tekstUitleg, toon } from "@/components/admin/stijl";

type Waarden = Record<WebsiteSleutel, string>;

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

/** Eén regel tekst met label, uitleg en (optioneel) een foutmelding. */
function TekstVeld({
  id,
  label,
  waarde,
  max,
  placeholder,
  onChange,
  uitleg,
  fout,
  type = "text",
}: {
  id: string;
  label: string;
  waarde: string;
  max: number;
  placeholder?: string;
  onChange: (waarde: string) => void;
  uitleg?: ReactNode;
  fout?: string | null;
  type?: "text" | "tel";
}) {
  const beschrijving = [uitleg ? `${id}-uitleg` : null, fout ? `${id}-fout` : null].filter(Boolean).join(" ");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        type={type}
        {...(type === "tel" ? { inputMode: "tel" as const, autoComplete: "tel" } : {})}
        value={waarde}
        maxLength={max}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={fout ? true : undefined}
        aria-describedby={beschrijving || undefined}
        className={invoerBreed}
      />
      {fout && (
        <p id={`${id}-fout`} className={`text-xs ${tekstFout}`}>
          {fout}
        </p>
      )}
      {uitleg && (
        <p id={`${id}-uitleg`} className={tekstUitleg}>
          {uitleg}
        </p>
      )}
    </div>
  );
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
  const homeTitel = w.home_titel.trim().replace(/\s+/g, " ") || STANDAARD_SITE.homeTitel;
  const deelTitel = w.deel_titel.trim().replace(/\s+/g, " ") || STANDAARD_SITE.deelTitel;
  const nietIndexeren = w.niet_indexeren === "ja";
  const telefoon = valideerTelefoon(w.telefoon);
  const telefoonFout = telefoon.ok ? null : telefoon.fout;
  const afzenderFout = /[<>"@\\]/.test(w.afzender_naam) ? "Alleen een naam, zonder e-mailadres of tekens als < > \" @." : null;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        opslaan();
      }}
      className="flex flex-col gap-6"
    >
      {/* Naam en omschrijving ------------------------------------------------------ */}
      <section className={kaart} aria-labelledby="kop-naam">
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
            className={invoerBreed}
          />
          <p className={tekstUitleg}>
            De naam zoals bezoekers die zien: bovenaan de site (als er geen logo is), achter elke paginatitel in het tabblad en in
            zoekresultaten, in de footer en als woordmerk in e-mails en PDF&apos;s. Leeg laten: &lsquo;{STANDAARD_SITE.korteNaam}
            &rsquo; (en &lsquo;{STANDAARD_SITE.volledigeNaam}&rsquo; in de footer en bij delen). De officiële{" "}
            <strong>bedrijfsnaam</strong> (facturen, voorwaarden, gegevens voor zoekmachines) stel je apart in bij{" "}
            <Link href="/admin/instellingen" className="text-accent underline underline-offset-4">
              Instellingen → Algemeen
            </Link>
            .
          </p>
        </div>
        <TekstVeld
          id="home_titel"
          label="Titel van de homepage"
          waarde={w.home_titel}
          max={MAX_TITEL}
          placeholder={STANDAARD_SITE.homeTitel}
          onChange={(v) => zet("home_titel", v)}
          uitleg={
            <>
              In het tabblad en in Google, met de naam van de website erachter (&lsquo;{homeTitel} · {korteNaam}&rsquo;). Zoekmachines
              tonen ongeveer 60 tekens.
            </>
          }
        />
        <TekstVeld
          id="deel_titel"
          label="Titel bij delen"
          waarde={w.deel_titel}
          max={MAX_TITEL}
          placeholder={STANDAARD_SITE.deelTitel}
          onChange={(v) => zet("deel_titel", v)}
          uitleg={
            <>
              Als iemand de homepage deelt (WhatsApp, Facebook, LinkedIn), met de naam erachter. Staat ook groot op de
              standaard-deelafbeelding; het laatste woord wordt het cursieve accent.
            </>
          }
        />
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
            className={invoerBreed}
          />
          <p id="site_omschrijving-uitleg" className={tekstUitleg}>
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

      {/* Zoekmachines ------------------------------------------------------------ */}
      <section
        className={`${kaart} ${nietIndexeren ? "border-amber-400 dark:border-amber-500/60" : ""}`}
        aria-labelledby="kop-zoekmachines"
      >
        <h2 id="kop-zoekmachines" className="text-lg font-semibold">
          Zoekmachines
        </h2>
        <label className="flex items-start gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={nietIndexeren}
            onChange={(e) => zet("niet_indexeren", e.target.checked ? "ja" : "")}
            aria-describedby="niet_indexeren-uitleg"
            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
          />
          <span>Niet indexeren: houd de hele website uit Google en andere zoekmachines</span>
        </label>
        <p id="niet_indexeren-uitleg" className={tekstUitleg}>
          Handig zolang de site nog niet af is. robots.txt blokkeert dan alles, elke pagina krijgt &lsquo;noindex&rsquo; en de
          sitemap is leeg. Bezoekers met de link kunnen de site gewoon bekijken.
        </p>
        {nietIndexeren && (
          <p role="status" className={`rounded-lg px-3 py-2 text-sm ${toon.amber}`}>
            <strong>Let op:</strong> zolang dit aan staat, is de site niet te vinden in zoekmachines. Zet het uit bij de livegang
            (het staat ook op de lijst &lsquo;Klaar voor livegang&rsquo; op het overzicht).
          </p>
        )}
        <p className={tekstUitleg}>
          Titels, omschrijvingen en &lsquo;in de sitemap&rsquo; van de vaste pagina&apos;s (bestellen, afspraak, blog, privacy …)
          stel je in bij{" "}
          <Link href="/admin/website/seo" className="text-accent underline underline-offset-4">
            Website → SEO
          </Link>
          ; die van je eigen pagina&apos;s en blogberichten bij die pagina of dat bericht.
        </p>
      </section>

      {/* Afbeeldingen ------------------------------------------------------------- */}
      <section className={kaart} aria-labelledby="kop-beelden">
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
      <section className={kaart} aria-labelledby="kop-social">
        <div className="flex flex-col gap-1">
          <h2 id="kop-social" className="text-lg font-semibold">
            Social media
          </h2>
          <p className={tekstUitleg}>Ingevulde netwerken verschijnen als pictogram in de footer. Laat leeg wat je niet gebruikt.</p>
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
                className={invoerBreed}
              />
              {fout && (
                <p id={`${s.sleutel}-fout`} className={`text-xs ${tekstFout}`}>
                  {fout}
                </p>
              )}
            </div>
          );
        })}
      </section>

      {/* Bedrijfsgegevens --------------------------------------------------------- */}
      <section className={kaart} aria-labelledby="kop-bedrijf">
        <div className="flex flex-col gap-1">
          <h2 id="kop-bedrijf" className="text-lg font-semibold">
            Bedrijfsgegevens voor zoekmachines
          </h2>
          <p className={tekstUitleg}>
            Google gebruikt deze gegevens (samen met bedrijfsnaam, adres en e-mail uit{" "}
            <Link href="/admin/instellingen" className="text-accent underline underline-offset-4">
              Instellingen → Algemeen
            </Link>
            ) om je bedrijf te herkennen. Alles is optioneel.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="bedrijf_type" className="text-sm font-medium">
            Soort bedrijf
          </label>
          <select
            id="bedrijf_type"
            value={w.bedrijf_type || BEDRIJF_TYPES[0].waarde}
            onChange={(e) => zet("bedrijf_type", e.target.value)}
            className={invoerBreed}
          >
            {BEDRIJF_TYPES.map((t) => (
              <option key={t.waarde} value={t.waarde}>
                {t.label}
              </option>
            ))}
          </select>
          <p className={tekstUitleg}>
            &lsquo;Lokaal bedrijf&rsquo; past als klanten bij je langskomen op een vast adres; anders is de standaard prima.
          </p>
        </div>
        <TekstVeld
          id="telefoon"
          label="Telefoonnummer"
          waarde={w.telefoon}
          max={30}
          type="tel"
          placeholder="06 12345678"
          onChange={(v) => zet("telefoon", v)}
          fout={telefoonFout}
          uitleg="Leeg = geen telefoonnummer. Ingevuld staat het ook in de voettekst en in de bedrijfsgegevens van de voorwaarden en privacyverklaring."
        />
        <TekstVeld
          id="werkgebied"
          label="Werkgebied"
          waarde={w.werkgebied}
          max={MAX_WERKGEBIED}
          placeholder="Nederland"
          onChange={(v) => zet("werkgebied", v)}
          uitleg="Plaatsen of regio's waar je klanten helpt, gescheiden door komma's (bijv. Utrecht, Amersfoort). Leeg = heel Nederland."
        />
        <TekstVeld
          id="eigenaar_naam"
          label="Naam van de eigenaar"
          waarde={w.eigenaar_naam}
          max={MAX_NAAM}
          placeholder={STANDAARD_SITE.eigenaarNaam}
          onChange={(v) => zet("eigenaar_naam", v)}
          uitleg="Staat bij ‘Eigenaar’ in de bedrijfsgegevens van de voorwaarden en privacyverklaring."
        />
      </section>

      {/* Blog en e-mail ----------------------------------------------------------- */}
      <section className={kaart} aria-labelledby="kop-namen">
        <h2 id="kop-namen" className="text-lg font-semibold">
          Namen in blog en e-mail
        </h2>
        <TekstVeld
          id="standaard_auteur"
          label="Standaardauteur van blogberichten"
          waarde={w.standaard_auteur}
          max={MAX_NAAM}
          placeholder={w.eigenaar_naam.trim() || STANDAARD_SITE.eigenaarNaam}
          onChange={(v) => zet("standaard_auteur", v)}
          uitleg="Voor nieuwe berichten en voor berichten zonder auteur (op de site, in de RSS-feed en voor Google). Leeg = de naam van de eigenaar."
        />
        <TekstVeld
          id="afzender_naam"
          label="Naam van de afzender van e-mails"
          waarde={w.afzender_naam}
          max={MAX_NAAM}
          placeholder="zoals ingesteld in RESEND_VAN"
          onChange={(v) => zet("afzender_naam", v)}
          fout={afzenderFout}
          uitleg="De naam die klanten in hun inbox zien bij alle mails van de site en de nieuwsbrief. Het e-mailadres zelf blijft het geverifieerde adres uit Vercel (RESEND_VAN). Antwoorden van klanten gaan naar het contact-e-mailadres uit Instellingen → Algemeen."
        />
      </section>

      {/* Voettekst --------------------------------------------------------------- */}
      <section className={kaart} aria-labelledby="kop-voettekst">
        <h2 id="kop-voettekst" className="text-lg font-semibold">
          Voettekst
        </h2>
        <label className="flex items-start gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={w.footer_beheerlink === "tonen"}
            onChange={(e) => zet("footer_beheerlink", e.target.checked ? "tonen" : "")}
            className="mt-0.5 h-4 w-4 accent-[var(--accent)]"
          />
          <span>Link &lsquo;Beheer&rsquo; tonen in de voettekst</span>
        </label>
        <p className={tekstUitleg}>
          Standaard uit: bezoekers zien dan geen beheerlink. Inloggen kan altijd via {host}/admin. De vaste links, de teksten van de links naar privacy, voorwaarden en
          contact, een korte zin en een regel met adres of contact stel je in bij{" "}
          <Link href="/admin/teksten/website#website-kop" className="text-accent underline underline-offset-4">
            Teksten → Kop en voettekst
          </Link>
          .
        </p>
      </section>

      {/* Voorbeelden -------------------------------------------------------------- */}
      <section className={kaart} aria-labelledby="kop-voorbeeld">
        <div className="flex flex-col gap-1">
          <h2 id="kop-voorbeeld" className="text-lg font-semibold">
            Zo ziet het eruit
          </h2>
          <p className={tekstUitleg}>
            Een benadering voor de homepage; Google en social media bepalen zelf de precieze weergave. Na het opslaan kan het
            even duren voordat zij de nieuwe gegevens oppikken.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground/70">In Google</h3>
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
              {homeTitel} · {korteNaam}
            </p>
            <p className="mt-1 line-clamp-2 text-sm text-[#4d5156]">{inkorten(omschrijving, ADVIES_OMSCHRIJVING.max)}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-foreground/70">Bij delen op social media</h3>
          <div className="w-full max-w-md overflow-hidden rounded-xl bg-white font-sans text-[#1c1e21] ring-1 ring-black/10">
            {/* eslint-disable-next-line @next/next/no-img-element -- voorbeeld */}
            <img src={deelbeeld} alt="Voorbeeld van de deelafbeelding" className="aspect-[1200/630] w-full bg-[#f0f2f5] object-cover" />
            <div className="flex flex-col gap-0.5 border-t border-black/10 bg-[#f0f2f5] px-3 py-2.5">
              <span className="truncate text-xs uppercase text-[#606770]">{host}</span>
              <span className="truncate font-semibold">
                {deelTitel} · {korteNaam}
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
          className={knop}
        >
          {bezig ? "Bezig met opslaan…" : "Opslaan"}
        </button>
        {gewijzigd && !bezig && <span className="text-xs text-foreground/70">Niet-opgeslagen wijzigingen</span>}
      </div>
    </form>
  );
}
