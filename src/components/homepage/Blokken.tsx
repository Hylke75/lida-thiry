import Link from "next/link";
import type { ReactNode } from "react";
import { Lichaam } from "@/components/Lichaam";
import { Opmaak } from "@/components/Opmaak";
import { NieuwsbriefAanmelden } from "@/components/NieuwsbriefAanmelden";
import { ArtikelKaart } from "@/components/site/ArtikelKaart";
import { BeeldPlek } from "@/components/site/BeeldPlek";
import { Bovenschrift, Container, Knop, KopTekst, Pijl, SectieIntro, SectieKop, TekstLink } from "@/components/site/Basis";
import { NIEUWSBRIEF_VERLOOP } from "@/components/site/InhoudNieuwsbrief";
import { ANKER, BOVENSCHRIFT, CITAAT, CONTAINER, FOTOKADER, H1, H2, H3, KLEINE_LINK, SECTIE, TEKST } from "@/components/site/stijl";
import { vulIn, type SectieWaarden } from "@/lib/inhoud/schema";
import type {
  WEBSITE_ADVIES,
  WEBSITE_AFSLUITING,
  WEBSITE_BLOG,
  WEBSITE_DIENSTEN,
  WEBSITE_ERVARINGEN,
  WEBSITE_FIGUURTYPES,
  WEBSITE_HERO,
  WEBSITE_OVER,
  WEBSITE_PROBLEEM,
  WEBSITE_STAPPEN,
  WEBSITE_VRAGEN,
} from "@/lib/inhoud/groepen/website";
import type { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import type { BlogBericht } from "@/lib/blog/regels";
import type { PubliekeReview } from "@/lib/reviews/regels";
import type { HomepageBlok } from "@/lib/website/homepage";
import { ervaringItems, MAX_ERVARINGEN, metAanhalingstekens, veiligeLink } from "@/lib/website/weergave";

// De blokken van de homepage, elk als losse component, in de vormgeving van
// docs/ontwerp met de herziening van oktober 2026 (HUISSTIJL-HANDBOEK.md):
// rustig als een boetiek, aubergine en koraal op warme neutrale tinten, geen
// decoratieve vormen of patronen, fotoplekken als rustige staande kaders en
// citaten typografisch. De pagina (app/page.tsx) haalt alle gegevens één keer
// op en toont de blokken in de volgorde uit Beheer → Website → Homepage
// (lib/website/homepage.ts).

// Let op: de figuurtypes zelf (namen, tekeningen, uitleg) zijn alleen voor
// betalende klanten (achter de testlink). Geen enkel blok hier krijgt of toont
// gegevens van de lichaamstypes; de getekende figuur is de neutrale standaardvorm.

export interface HomepageGegevens {
  /** Invulwaarden voor de prijzen op de dienstenkaarten ({prijs}, {afspraak_vanaf}); leeg als onbekend. */
  prijzen: { prijs: string; afspraak_vanaf: string };
  /** Tekst van de knop naar de test in de afsluiting (met prijs). */
  ctaTekst: string;
  /** Link van de knop bij Over Lida (bestaande pagina, anders /contact of /afspraak). */
  overLink: string;
  hero: SectieWaarden<typeof WEBSITE_HERO>;
  diensten: SectieWaarden<typeof WEBSITE_DIENSTEN>;
  probleem: SectieWaarden<typeof WEBSITE_PROBLEEM>;
  stappen: SectieWaarden<typeof WEBSITE_STAPPEN>;
  figuurtypes: SectieWaarden<typeof WEBSITE_FIGUURTYPES>;
  advies: SectieWaarden<typeof WEBSITE_ADVIES>;
  over: SectieWaarden<typeof WEBSITE_OVER>;
  ervaringen: SectieWaarden<typeof WEBSITE_ERVARINGEN>;
  /** Goedgekeurde reviews met toestemming (nieuwste eerst); staan vóór de handmatige ervaringen. */
  reviews: readonly PubliekeReview[];
  vragen: SectieWaarden<typeof WEBSITE_VRAGEN>;
  afsluiting: SectieWaarden<typeof WEBSITE_AFSLUITING>;
  nieuwsbrief: SectieWaarden<typeof NIEUWSBRIEF_AANMELDEN>;
  blog: SectieWaarden<typeof WEBSITE_BLOG>;
  blogberichten: readonly BlogBericht[];
}

type Blok = (g: HomepageGegevens) => ReactNode;

export { MAX_ERVARINGEN };

/** Lijst met dunne koraalkleurige vinkjes (rustiger dan de ronde vinkjes uit de demo). */
function Vinklijst({ punten, className = "" }: { punten: readonly { _id: string; tekst: string }[]; className?: string }) {
  const zichtbaar = punten.filter((p) => p.tekst.trim());
  if (!zichtbaar.length) return null;
  return (
    <ul className={`m-0 grid list-none gap-[14px] p-0 ${className}`}>
      {zichtbaar.map((p) => (
        <li key={p._id} className="relative pl-[34px] text-[17px] leading-[1.55] font-medium text-ink tablet:text-[18px]">
          <svg
            aria-hidden="true"
            viewBox="0 0 16 16"
            className="absolute top-[0.2em] left-0 h-[19px] w-[19px] text-coral-tekst"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            focusable="false"
          >
            <path d="M3 8.5 6.5 12 13 4.5" />
          </svg>
          {p.tekst}
        </li>
      ))}
    </ul>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────────

const Hero: Blok = ({ hero }) => {
  const pluspunten = hero.pluspunten.filter((p) => p.tekst.trim());
  return (
    <section id="top" aria-labelledby="hero-titel" className="border-b border-line bg-cream">
      <div
        className={`${CONTAINER} grid grid-cols-1 items-center gap-12 pt-[56px] pb-[64px] tablet:pt-[72px] tablet:pb-[84px] desktop:grid-cols-[1.08fr_.92fr] desktop:gap-16 desktop:py-[88px]`}
      >
        <div>
          {hero.bovenschrift && <Bovenschrift>{hero.bovenschrift}</Bovenschrift>}
          <h1 id="hero-titel" className={H1}>
            <KopTekst tekst={hero.titel} />
          </h1>
          <p className="mt-0 mb-[30px] max-w-[620px] text-[19px] leading-[1.6] text-ink-soft tablet:text-[20px]">{hero.intro}</p>
          <div className="flex flex-col items-start gap-[15px] tablet:flex-row tablet:flex-wrap tablet:items-center tablet:gap-6">
            <Knop href={veiligeLink(hero.knopLink, "#advies")}>{hero.knop}</Knop>
            {hero.tweedeLink.trim() && <TekstLink href={veiligeLink(hero.tweedeLinkAdres, "#over")}>{hero.tweedeLink}</TekstLink>}
          </div>
          {pluspunten.length > 0 && (
            <ul
              aria-label="Pluspunten"
              className="m-0 mt-8 flex list-none flex-col gap-x-6 gap-y-2.5 p-0 text-[15px] font-semibold text-ink tablet:mt-10 tablet:flex-row tablet:flex-wrap"
            >
              {pluspunten.map((p) => (
                <li key={p._id} className="flex items-center">
                  <span aria-hidden="true" className="mr-2.5 inline-block h-[6px] w-[6px] rounded-full bg-coral" />
                  {p.tekst}
                </li>
              ))}
            </ul>
          )}
          {/* "Kleding doet iets.": een rustige tussenregel in de tekstkolom, geen los kaartje. */}
          {hero.stickerTitel.trim() && (
            <div className="mt-10 max-w-[460px] border-l-2 border-coral pl-5">
              <p className="m-0 font-serif text-[25px] leading-[1.2] text-berry">{hero.stickerTitel}</p>
              {hero.stickerTekst && <p className="mt-1.5 mb-0 text-[17px] leading-[1.55] text-ink-soft">{hero.stickerTekst}</p>}
            </div>
          )}
        </div>

        <BeeldPlek
          src={hero.afbeelding}
          alt={hero.afbeeldingAlt}
          sizes="(min-width: 641px) 480px, 100vw"
          prioriteit
          className={`${FOTOKADER} aspect-[4/5] w-full max-w-[480px] justify-self-center desktop:justify-self-end`}
        />
      </div>
    </section>
  );
};

// ── Adviesroutes ────────────────────────────────────────────────────────────

const Diensten: Blok = ({ diensten, prijzen }) => {
  const kaarten = diensten.kaarten.filter((k) => k.titel.trim());
  if (!kaarten.length) return null;
  return (
    <section id="advies" aria-labelledby="advies-titel" className={`${SECTIE} ${ANKER}`}>
      <Container>
        <SectieKop
          id="advies-titel"
          bovenschrift={diensten.bovenschrift}
          titel={diensten.titel}
          rechts={diensten.intro.trim() ? <SectieIntro>{diensten.intro}</SectieIntro> : undefined}
        />
        <div className="grid grid-cols-1 gap-6 desktop:grid-cols-3">
          {kaarten.map((k) => {
            const prijs = vulIn(k.prijs, prijzen).trim();
            const link = k.linkTekst.trim() ? veiligeLink(k.link, "") : "";
            // Neutrale kaart (wit, dunne warme lijn) met bovenaan een staand fotokader.
            // Op de tablet staan foto en tekst naast elkaar, zodat het kader niet te hoog wordt.
            return (
              <article
                key={k._id}
                className="flex min-h-full flex-col rounded-[8px] border border-line bg-white p-4 tablet:grid tablet:grid-cols-[minmax(0,2fr)_3fr] tablet:items-start tablet:gap-8 desktop:flex desktop:gap-0"
              >
                <BeeldPlek
                  src={k.afbeelding}
                  alt={k.afbeeldingAlt}
                  sizes="(min-width: 981px) 350px, (min-width: 641px) 260px, 100vw"
                  className={`${FOTOKADER} aspect-[4/5] w-full`}
                />
                <div className="flex flex-1 flex-col px-2 pt-6 pb-2 tablet:h-full tablet:px-0 tablet:pt-2 desktop:h-auto desktop:px-2 desktop:pt-6">
                  {k.kicker && <p className={`${BOVENSCHRIFT} mb-2`}>{k.kicker}</p>}
                  <h3 className={`${H3} mb-4 text-[28px] tablet:text-[30px]`}>{k.titel}</h3>
                  {k.tekst && <p className={`mt-0 mb-5 ${TEKST}`}>{k.tekst}</p>}
                  {(prijs || link) && (
                    <div className="mt-auto flex items-end justify-between gap-5 border-t border-line pt-5">
                      {prijs && <strong className="font-serif text-[27px] leading-[1.2] font-normal">{prijs}</strong>}
                      {link && (
                        <Link href={link} className={`${KLEINE_LINK} ml-auto text-berry`}>
                          {k.linkTekst} <Pijl />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
};

// ── Herken je dit? ──────────────────────────────────────────────────────────

const Probleem: Blok = ({ probleem }) => (
  <section aria-labelledby="probleem-titel" className={`${SECTIE} bg-sand`}>
    <div className={`${CONTAINER} grid grid-cols-1 items-center gap-[42px] tablet:gap-16 desktop:grid-cols-[.85fr_1.15fr]`}>
      <BeeldPlek
        src={probleem.afbeelding}
        alt={probleem.afbeeldingAlt}
        sizes="(min-width: 641px) 440px, 100vw"
        className={`${FOTOKADER} aspect-[4/5] w-full max-w-[440px]`}
      />
      <div className="max-w-[660px]">
        {probleem.bovenschrift && <Bovenschrift>{probleem.bovenschrift}</Bovenschrift>}
        <h2 id="probleem-titel" className={H2}>
          <KopTekst tekst={probleem.titel} />
        </h2>
        {probleem.tekst && <p className={`mt-0 mb-[18px] ${TEKST}`}>{probleem.tekst}</p>}
        <Vinklijst punten={probleem.punten} className="mt-7" />
      </div>
    </div>
  </section>
);

// ── Zo werkt het ────────────────────────────────────────────────────────────

const Stappen: Blok = ({ stappen }) => (
  <section aria-labelledby="stappen-titel" className={`${SECTIE} bg-paper`}>
    <Container>
      <SectieKop id="stappen-titel" variant="midden" bovenschrift={stappen.bovenschrift} titel={stappen.titel} />
      {/* Typografische stappen: een dunne koraallijn, het nummer en de tekst; geen kaarten. */}
      <ol className="m-0 grid list-none grid-cols-1 gap-x-10 gap-y-10 p-0 desktop:grid-cols-3">
        {stappen.stappen.map((s, i) => (
          <li key={s._id} className="border-t border-coral pt-6">
            <span aria-hidden="true" className="mb-3 block font-serif text-[40px] leading-none text-coral-tekst">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className={`${H3} mb-[10px] text-[27px]`}>{s.titel}</h3>
            <p className={`m-0 ${TEKST}`}>{s.tekst}</p>
          </li>
        ))}
      </ol>
    </Container>
  </section>
);

// ── Over Lida ───────────────────────────────────────────────────────────────

const Over: Blok = ({ over, overLink }) => (
  <section id="over" aria-labelledby="over-titel" className={`${SECTIE} ${ANKER} bg-cream`}>
    <div className={`${CONTAINER} grid grid-cols-1 items-center gap-[42px] tablet:gap-16 desktop:grid-cols-[1.1fr_.9fr]`}>
      <div className="max-w-[620px]">
        {over.bovenschrift && <Bovenschrift>{over.bovenschrift}</Bovenschrift>}
        <h2 id="over-titel" className={H2}>
          <KopTekst tekst={over.titel} />
        </h2>
        <div className="text-[17px] text-ink-soft tablet:text-[18px] [&_a]:font-bold [&_a]:text-berry [&_a]:underline [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-[27px] [&_h2]:text-ink [&_h3]:font-bold [&_h3]:text-ink [&_p]:mt-0 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&>p:first-child]:mb-[19px] [&>p:first-child]:text-[19px] [&>p:first-child]:text-ink">
          <Opmaak tekst={over.tekst} />
        </div>
        {/* Citaat: typografisch, recht, met een dunne koraallijn; geen kaartje. */}
        {over.citaat.trim() && (
          <blockquote className="mx-0 my-8">
            <p className={CITAAT}>{metAanhalingstekens(over.citaat)}</p>
          </blockquote>
        )}
        {over.knop.trim() && (
          <Knop href={overLink} variant="outline" className="mt-3">
            {over.knop}
          </Knop>
        )}
      </div>
      <BeeldPlek
        src={over.afbeelding}
        alt={over.afbeeldingAlt}
        sizes="(min-width: 641px) 460px, 100vw"
        className={`${FOTOKADER} aspect-[4/5] w-full max-w-[460px] justify-self-center desktop:justify-self-end`}
      />
    </div>
  </section>
);

// ── Ervaringen ──────────────────────────────────────────────────────────────

/**
 * Altijd zichtbaar (als het blok aanstaat): goedgekeurde reviews en ingevulde
 * ervaringen typografisch als citaat; zonder echte reacties een rustige
 * plaatshouder uit de teksten (leegTekst). Nooit verzonnen reviews. Is ook die
 * tekst leeg gemaakt, dan valt het blok weg.
 */
const Ervaringen: Blok = ({ ervaringen, reviews }) => {
  const items = ervaringItems(reviews, ervaringen.ervaringen);
  // ?? "": een oudere aanroeper zonder het veld blijft werken.
  const leeg = (ervaringen.leegTekst ?? "").trim();
  if (!items.length && !leeg) return null;
  return (
    <section aria-labelledby="ervaringen-titel" className={`${SECTIE} bg-white`}>
      <Container>
        <SectieKop id="ervaringen-titel" variant="midden" smal bovenschrift={ervaringen.bovenschrift} titel={ervaringen.titel} />
        {items.length > 0 ? (
          <div className="grid grid-cols-1 gap-x-12 gap-y-12 desktop:grid-cols-3">
            {items.map((e) => (
              <figure key={e.key} className="m-0">
                <blockquote className="m-0">
                  <p className="m-0 border-l-2 border-coral pl-5 font-serif text-[24px] leading-[1.28] text-berry tablet:text-[26px]">{e.citaat}</p>
                </blockquote>
                {e.naam && <figcaption className="mt-4 pl-5 text-[15px] font-semibold text-ink-soft">— {e.naam}</figcaption>}
              </figure>
            ))}
          </div>
        ) : (
          <p className="mx-auto my-0 max-w-[560px] text-center text-[18px] text-ink-soft">{leeg}</p>
        )}
      </Container>
    </section>
  );
};

// ── Blog: zelf ontdekken ────────────────────────────────────────────────────

/** Alleen als er gepubliceerde berichten zijn. */
const Blog: Blok = ({ blog, blogberichten }) => {
  if (!blogberichten.length) return null;
  return (
    <section id="blog" aria-labelledby="blog-titel" className={`${SECTIE} ${ANKER} bg-cream`}>
      <Container>
        <SectieKop
          id="blog-titel"
          bovenschrift={blog.bovenschrift}
          titel={blog.titel}
          rechts={
            <TekstLink href="/blog" pijl>
              {blog.linktekst}
            </TekstLink>
          }
        />
        <ul className="m-0 grid list-none grid-cols-1 gap-5 p-0 desktop:grid-cols-3">
          {blogberichten.map((b) => (
            <li key={b.id}>
              <ArtikelKaart bericht={b} leesVerder={blog.leesVerder} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
};

// ── Nieuwsbrief ─────────────────────────────────────────────────────────────

const Nieuwsbrief: Blok = ({ nieuwsbrief }) => (
  <section id="nieuwsbrief" aria-label="Nieuwsbrief" className={`${ANKER} pb-[68px] tablet:pb-[92px]`}>
    <Container>
      <div className={`rounded-[8px] ${NIEUWSBRIEF_VERLOOP} px-6 py-[30px] tablet:p-[52px]`}>
        <NieuwsbriefAanmelden weergave="paneel" teksten={nieuwsbrief} toestemming={<Opmaak tekst={nieuwsbrief.toestemming_tekst} />} />
      </div>
    </Container>
  </section>
);

// ── Optionele blokken (niet in het ontwerp, wel in dezelfde stijl) ───────────

const Vragen: Blok = ({ vragen }) => {
  const lijst = vragen.vragen.filter((v) => v.vraag.trim());
  if (!lijst.length) return null;
  return (
    <section aria-labelledby="vragen-titel" className={`${SECTIE} bg-white`}>
      <div className={`${CONTAINER} max-w-[800px]`}>
        <SectieKop id="vragen-titel" variant="midden" bovenschrift={vragen.bovenschrift} titel={vragen.titel} />
        <div className="divide-y divide-line border-y border-line">
          {lijst.map((v) => (
            <details key={v._id} className="group">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[18px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                {v.vraag}
                <span aria-hidden="true" className="font-serif text-[28px] leading-none text-berry transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className={`mt-0 mb-5 whitespace-pre-line ${TEKST}`}>{v.antwoord}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
};

/**
 * Algemene uitleg over figuurtypes (standaard verborgen). Bewust zonder de types
 * zelf: alleen een neutrale tekening met meetlint, tekst en een knop naar de test.
 */
const Figuurtypes: Blok = ({ figuurtypes }) => {
  // Oudere opgeslagen teksten kunnen nog {aantal} bevatten: nooit het echte aantal tonen.
  const vul = (t: string) => vulIn(t, { aantal: "verschillende" });
  return (
    <section aria-labelledby="figuurtypes-titel" className={`${SECTIE} bg-sand`}>
      <div className={`${CONTAINER} grid grid-cols-1 items-center gap-[42px] tablet:gap-16 desktop:grid-cols-[1.1fr_.9fr]`}>
        <div className="max-w-[660px]">
          {figuurtypes.bovenschrift && <Bovenschrift>{figuurtypes.bovenschrift}</Bovenschrift>}
          <h2 id="figuurtypes-titel" className={H2}>
            <KopTekst tekst={vul(figuurtypes.titel)} />
          </h2>
          {figuurtypes.intro && <p className={`mt-0 mb-[18px] ${TEKST}`}>{vul(figuurtypes.intro)}</p>}
          <Vinklijst punten={figuurtypes.punten} className="mt-7" />
          {figuurtypes.knop.trim() && (
            <Knop href={veiligeLink(figuurtypes.knopLink, "/bestellen")} className="mt-9">
              {figuurtypes.knop}
            </Knop>
          )}
        </div>
        {/* Neutrale tekening met meetlint in een rustig kader (decoratie; geen figuurtype). */}
        <div
          aria-hidden="true"
          className={`${FOTOKADER} mx-auto flex aspect-[4/5] w-full max-w-[400px] items-center justify-center [--lichaam-vulling:var(--white)]`}
        >
          <Lichaam meet="taille" titel="" className="h-[78%] w-auto" />
        </div>
      </div>
    </section>
  );
};

const Advies: Blok = ({ advies }) => (
  <section aria-labelledby="advies-inhoud-titel" className={SECTIE}>
    <div className={`${CONTAINER} grid grid-cols-1 items-center gap-[42px] tablet:gap-16 desktop:grid-cols-[1.1fr_.9fr]`}>
      <div className="max-w-[660px]">
        {advies.bovenschrift && <Bovenschrift>{advies.bovenschrift}</Bovenschrift>}
        <h2 id="advies-inhoud-titel" className={H2}>
          <KopTekst tekst={advies.titel} />
        </h2>
        {advies.intro && <p className={`mt-0 mb-[18px] ${TEKST}`}>{advies.intro}</p>}
        <Vinklijst punten={advies.punten} className="mt-7" />
      </div>
      {/* Schematisch voorbeeld van de PDF (decoratie). */}
      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-sm rounded-[6px] border border-line bg-white p-8 shadow-[0_12px_32px_rgba(47,36,65,.06)]"
      >
        <p className="m-0 text-[10px] font-extrabold tracking-[0.13em] text-berry uppercase">{advies.voorbeeldLabel}</p>
        <p className="mt-4 mb-0 font-serif text-2xl leading-tight">{advies.voorbeeldTitel}</p>
        <p className="m-0 mt-1 font-serif text-lg text-berry">{advies.voorbeeldType}</p>
        <div className="mt-6 flex gap-4">
          <Lichaam armen={false} titel="" className="h-28 w-auto flex-none" />
          <div className="flex flex-1 flex-col gap-2 pt-2">
            <div className="h-2 w-full rounded bg-ink/10" />
            <div className="h-2 w-5/6 rounded bg-ink/10" />
            <div className="h-2 w-4/6 rounded bg-ink/10" />
            <div className="mt-3 h-2 w-1/2 rounded bg-coral" />
            <div className="h-2 w-full rounded bg-ink/10" />
            <div className="h-2 w-3/4 rounded bg-ink/10" />
          </div>
        </div>
        <p className="mt-6 mb-0 text-center text-xs text-ink-soft">{advies.voorbeeldOnderschrift}</p>
      </div>
    </div>
  </section>
);

const Afsluiting: Blok = ({ afsluiting, ctaTekst }) => (
  <section aria-labelledby="afsluiting-titel" className={`${SECTIE} bg-sand`}>
    <div className={`${CONTAINER} flex max-w-[800px] flex-col items-center text-center`}>
      <h2 id="afsluiting-titel" className={H2}>
        <KopTekst tekst={afsluiting.titel} />
      </h2>
      <p className="mt-0 mb-[30px] text-[19px] leading-[1.6] text-ink-soft">{afsluiting.tekst}</p>
      <Knop href={veiligeLink(afsluiting.knopLink, "/bestellen")}>{ctaTekst}</Knop>
    </div>
  </section>
);

export const HOMEPAGE_WEERGAVE: Readonly<Record<HomepageBlok, Blok>> = {
  hero: Hero,
  diensten: Diensten,
  probleem: Probleem,
  stappen: Stappen,
  over: Over,
  ervaringen: Ervaringen,
  blog: Blog,
  nieuwsbrief: Nieuwsbrief,
  vragen: Vragen,
  figuurtypes: Figuurtypes,
  advies: Advies,
  afsluiting: Afsluiting,
};
