import Link from "next/link";
import type { ReactNode } from "react";
import { Lichaam } from "@/components/Lichaam";
import { Opmaak } from "@/components/Opmaak";
import { NieuwsbriefAanmelden } from "@/components/NieuwsbriefAanmelden";
import { ArtikelKaart } from "@/components/site/ArtikelKaart";
import { BeeldPlek } from "@/components/site/BeeldPlek";
import { Bovenschrift, Container, KleurLint, Knop, KopTekst, Pijl, SectieIntro, SectieKop, TekstLink } from "@/components/site/Basis";
import {
  ANKER,
  CONTAINER,
  H1,
  H2,
  H3,
  KAART_ACHTERGROND,
  KAART_NUMMER,
  KAART_RAND,
  KAART_VLAK,
  KLEINE_LINK,
  SECTIE,
} from "@/components/site/stijl";
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
import { ervaringItems, kaartKleur, MAX_ERVARINGEN, metAanhalingstekens, veiligeLink } from "@/lib/website/weergave";

// De blokken van de homepage, elk als losse component, in de vormgeving van
// docs/ontwerp (index.html + styles.css). De pagina (app/page.tsx) haalt alle
// gegevens één keer op en toont de blokken in de volgorde uit
// Beheer → Website → Homepage (lib/website/homepage.ts).

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

/** Lijst met ronde koraalkleurige vinkjes (.check-list). */
function Vinklijst({ punten, className = "" }: { punten: readonly { _id: string; tekst: string }[]; className?: string }) {
  const zichtbaar = punten.filter((p) => p.tekst.trim());
  if (!zichtbaar.length) return null;
  return (
    <ul className={`m-0 grid list-none gap-[14px] p-0 ${className}`}>
      {zichtbaar.map((p) => (
        <li key={p._id} className="relative pl-[38px] font-[650]">
          <span aria-hidden="true" className="absolute top-px left-0 grid h-[25px] w-[25px] place-items-center rounded-full bg-coral text-white">
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">
              <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
            </svg>
          </span>
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
    <section
      id="top"
      aria-labelledby="hero-titel"
      className="relative overflow-hidden bg-[linear-gradient(108deg,#fff7ef_0%,#fffaf5_48%,#fdf2eb_100%)] before:absolute before:-top-[120px] before:-left-[90px] before:h-[300px] before:w-[300px] before:rounded-full before:bg-mint before:opacity-[.28] before:content-['']"
    >
      <div className={`${CONTAINER} grid min-h-[690px] grid-cols-1 items-stretch desktop:grid-cols-[1.02fr_.98fr] desktop:gap-14`}>
        <div className="relative z-[2] self-center pt-[78px] pb-[56px] desktop:pt-[98px] desktop:pb-[82px]">
          {hero.bovenschrift && <Bovenschrift>{hero.bovenschrift}</Bovenschrift>}
          <h1 id="hero-titel" className={H1}>
            <KopTekst tekst={hero.titel} />
          </h1>
          <p className="mt-0 mb-[30px] max-w-[690px] text-[19px] text-ink-soft">{hero.intro}</p>
          <div className="flex flex-col items-start gap-[15px] tablet:flex-row tablet:flex-wrap tablet:items-center tablet:gap-6">
            <Knop href={veiligeLink(hero.knopLink, "#advies")}>{hero.knop}</Knop>
            {hero.tweedeLink.trim() && <TekstLink href={veiligeLink(hero.tweedeLinkAdres, "#over")}>{hero.tweedeLink}</TekstLink>}
          </div>
          {pluspunten.length > 0 && (
            <ul
              aria-label="Pluspunten"
              className="m-0 mt-[29px] flex list-none tablet:mt-[38px] flex-col gap-x-[22px] gap-y-3 p-0 text-[13px] font-bold text-ink-soft tablet:flex-row tablet:flex-wrap"
            >
              {pluspunten.map((p) => (
                <li key={p._id} className="flex items-center">
                  <span aria-hidden="true" className="mr-2 inline-block h-[9px] w-[9px] rounded-full bg-coral" />
                  {p.tekst}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative min-h-[430px] tablet:min-h-[520px] desktop:mr-[calc((100vw-min(100vw-40px,var(--container)))/-2)] desktop:min-h-[690px]">
          <BeeldPlek
            src={hero.afbeelding}
            alt={hero.afbeeldingAlt}
            sizes="(min-width: 981px) 50vw, 100vw"
            prioriteit
            vlak="bg-peach"
            className="absolute! inset-0"
          />
          {hero.stickerTitel.trim() && (
            <div className="absolute right-[14px] bottom-[22px] max-w-[245px] -rotate-[2.2deg] border-2 border-ink bg-butter px-6 py-[22px] shadow-[9px_9px_0_var(--ink)] tablet:right-auto tablet:bottom-[54px] tablet:left-[18px] tablet:max-w-[260px] desktop:left-[-35px]">
              <strong className="mb-1.5 block font-serif text-[24px] leading-[1.65] font-normal">{hero.stickerTitel}</strong>
              {hero.stickerTekst && <span className="block text-[13px] leading-[1.5]">{hero.stickerTekst}</span>}
            </div>
          )}
        </div>
      </div>
      <KleurLint />
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
        <div className="grid grid-cols-1 gap-[22px] desktop:grid-cols-3">
          {kaarten.map((k, i) => {
            const kleur = kaartKleur(k.kleur, i);
            const prijs = vulIn(k.prijs, prijzen).trim();
            const link = k.linkTekst.trim() ? veiligeLink(k.link, "") : "";
            return (
              <article
                key={k._id}
                className={`group flex min-h-full flex-col overflow-hidden rounded-ontwerp-md border border-line ${KAART_ACHTERGROND[kleur]}`}
              >
                <BeeldPlek
                  src={k.afbeelding}
                  alt={k.afbeeldingAlt}
                  sizes="(min-width: 981px) 380px, 100vw"
                  vlak={KAART_VLAK[kleur]}
                  className="aspect-[1.2/1]"
                  beeldKlasse="transition-transform duration-500 motion-safe:group-hover:scale-[1.035]"
                />
                <div className="flex flex-1 flex-col p-6 tablet:p-[30px]">
                  {k.kicker && <p className="mt-0 mb-2 text-[13px] font-extrabold tracking-[0.1em] uppercase">{k.kicker}</p>}
                  <h3 className={`${H3} mb-4 text-[30px]`}>{k.titel}</h3>
                  {k.tekst && <p className="mt-0 mb-4 text-ink-soft">{k.tekst}</p>}
                  {(prijs || link) && (
                    <div className="mt-auto flex items-end justify-between gap-5 border-t border-[rgba(47,36,65,.12)] pt-5">
                      {prijs && <strong className="font-serif text-[28px] leading-[1.2] font-normal">{prijs}</strong>}
                      {link && (
                        <Link href={link} className={`${KLEINE_LINK} ml-auto`}>
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
  <section aria-labelledby="probleem-titel" className={`${SECTIE} bg-[#f8f1eb]`}>
    <div className={`${CONTAINER} grid grid-cols-1 items-center gap-[42px] tablet:gap-16 desktop:grid-cols-[.9fr_1.1fr]`}>
      <BeeldPlek
        src={probleem.afbeelding}
        alt={probleem.afbeeldingAlt}
        sizes="(min-width: 981px) 520px, (min-width: 641px) 560px, 100vw"
        vlak="bg-coral-soft"
        className="aspect-square w-full max-w-[560px] rounded-[46%_54%_46%_54%/52%_42%_58%_48%] shadow-ontwerp desktop:max-w-none"
      />
      <div className="max-w-[660px]">
        {probleem.bovenschrift && <Bovenschrift>{probleem.bovenschrift}</Bovenschrift>}
        <h2 id="probleem-titel" className={H2}>
          <KopTekst tekst={probleem.titel} />
        </h2>
        {probleem.tekst && <p className="mt-0 mb-[18px] text-[18px] text-ink-soft">{probleem.tekst}</p>}
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
      <ol className="m-0 grid list-none grid-cols-1 gap-[18px] p-0 desktop:grid-cols-3">
        {stappen.stappen.map((s, i) => {
          const kleur = kaartKleur("", i);
          return (
            <li
              key={s._id}
              className={`border-t-[5px] bg-white p-6 shadow-[0_14px_40px_rgba(58,40,52,.06)] tablet:px-[30px] tablet:py-8 ${KAART_RAND[kleur]}`}
            >
              <span aria-hidden="true" className={`mb-[18px] block font-serif text-[42px] ${KAART_NUMMER[kleur]}`}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className={`${H3} mb-[10px] text-[27px]`}>{s.titel}</h3>
              <p className="m-0 text-ink-soft">{s.tekst}</p>
            </li>
          );
        })}
      </ol>
    </Container>
  </section>
);

// ── Over Lida ───────────────────────────────────────────────────────────────

const Over: Blok = ({ over, overLink }) => (
  <section id="over" aria-labelledby="over-titel" className={`${SECTIE} ${ANKER} bg-[linear-gradient(90deg,#fff7f0_0,#fffdf9_62%)]`}>
    <div className={`${CONTAINER} grid grid-cols-1 items-center gap-[42px] tablet:gap-[70px] desktop:grid-cols-2`}>
      <div className="max-w-[620px]">
        {over.bovenschrift && <Bovenschrift>{over.bovenschrift}</Bovenschrift>}
        <h2 id="over-titel" className={H2}>
          <KopTekst tekst={over.titel} />
        </h2>
        <div className="[&_a]:text-berry [&_a]:underline [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-[27px] [&_h3]:font-bold [&_p]:mt-0 [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&>p:first-child]:mb-[19px] [&>p:first-child]:text-[19px] [&>p:first-child]:text-ink-soft">
          <Opmaak tekst={over.tekst} />
        </div>
        {over.knop.trim() && (
          <Knop href={overLink} variant="outline" className="mt-3">
            {over.knop}
          </Knop>
        )}
      </div>
      <div className="relative">
        <BeeldPlek
          src={over.afbeelding}
          alt={over.afbeeldingAlt}
          sizes="(min-width: 981px) 555px, 100vw"
          vlak="bg-peach"
          className="aspect-[.9/1] rounded-[52%_48%_18%_18%/43%_41%_18%_18%]"
        >
          {over.initialen && <span className="font-serif text-[clamp(72px,12vw,140px)] leading-none text-berry">{over.initialen}</span>}
        </BeeldPlek>
        {over.citaat.trim() && (
          <p className="relative m-0 mx-4 -mt-[34px] max-w-[330px] rotate-[1.2deg] border-2 border-ink bg-mint p-[22px] font-serif text-[24px] leading-[1.15] tablet:absolute tablet:bottom-7 tablet:left-4 tablet:m-0 desktop:left-[-45px]">
            {metAanhalingstekens(over.citaat)}
          </p>
        )}
      </div>
    </div>
  </section>
);

// ── Ervaringen ──────────────────────────────────────────────────────────────

/** Alleen als er goedgekeurde reviews of handmatig ingevulde (echte) ervaringen zijn. */
const Ervaringen: Blok = ({ ervaringen, reviews }) => {
  const items = ervaringItems(reviews, ervaringen.ervaringen);
  if (!items.length) return null;
  return (
    <section aria-labelledby="ervaringen-titel" className={`${SECTIE} bg-white`}>
      <Container>
        <SectieKop id="ervaringen-titel" variant="midden" smal bovenschrift={ervaringen.bovenschrift} titel={ervaringen.titel} />
        <div className="grid grid-cols-1 gap-[18px] desktop:grid-cols-3">
          {items.map((e) => (
            <figure key={e.key} className="m-0 rounded-ontwerp-sm border border-line bg-paper p-6 tablet:p-7">
              <blockquote className="m-0">
                <p className="mt-0 mb-[23px] font-serif text-[23px] leading-[1.32]">{e.citaat}</p>
              </blockquote>
              {e.naam && <figcaption className="text-[14px] font-bold text-ink-soft">— {e.naam}</figcaption>}
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
};

// ── Blog: zelf ontdekken ────────────────────────────────────────────────────

/** Alleen als er gepubliceerde berichten zijn. */
const Blog: Blok = ({ blog, blogberichten }) => {
  if (!blogberichten.length) return null;
  return (
    <section id="blog" aria-labelledby="blog-titel" className={`${SECTIE} ${ANKER} bg-[#fffaf4]`}>
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
      <div className="rounded-ontwerp-lg bg-[linear-gradient(105deg,#ffe6df,#fff4d2_53%,#e8f4e5)] px-6 py-[30px] tablet:p-[52px]">
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
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-bold [&::-webkit-details-marker]:hidden">
                {v.vraag}
                <span aria-hidden="true" className="font-serif text-[28px] leading-none text-berry transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-0 mb-5 whitespace-pre-line text-ink-soft">{v.antwoord}</p>
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
    <section aria-labelledby="figuurtypes-titel" className={`${SECTIE} bg-cream`}>
      <div className={`${CONTAINER} grid grid-cols-1 items-center gap-[42px] tablet:gap-16 desktop:grid-cols-[1.1fr_.9fr]`}>
        <div className="max-w-[660px]">
          {figuurtypes.bovenschrift && <Bovenschrift>{figuurtypes.bovenschrift}</Bovenschrift>}
          <h2 id="figuurtypes-titel" className={H2}>
            <KopTekst tekst={vul(figuurtypes.titel)} />
          </h2>
          {figuurtypes.intro && <p className="mt-0 mb-[18px] text-[18px] text-ink-soft">{vul(figuurtypes.intro)}</p>}
          <Vinklijst punten={figuurtypes.punten} className="mt-7" />
          {figuurtypes.knop.trim() && (
            <Knop href={veiligeLink(figuurtypes.knopLink, "/bestellen")} className="mt-9">
              {figuurtypes.knop}
            </Knop>
          )}
        </div>
        {/* Neutrale tekening met meetlint (decoratie; geen figuurtype). */}
        <div aria-hidden="true" className="relative mx-auto w-full max-w-[420px]">
          <span className="absolute top-[8%] left-[2%] h-10 w-10 rounded-full bg-butter" />
          <span className="absolute right-[6%] bottom-[10%] h-7 w-7 rounded-full bg-sage" />
          <span className="absolute top-[18%] right-[2%] h-5 w-5 rounded-full bg-sky" />
          <div className="flex aspect-square items-center justify-center rounded-[46%_54%_46%_54%/52%_42%_58%_48%] bg-coral-soft shadow-ontwerp [--lichaam-vulling:var(--white)]">
            <Lichaam meet="taille" titel="" className="h-[78%] w-auto" />
          </div>
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
        {advies.intro && <p className="mt-0 mb-[18px] text-[18px] text-ink-soft">{advies.intro}</p>}
        <Vinklijst punten={advies.punten} className="mt-7" />
      </div>
      {/* Schematisch voorbeeld van de PDF (decoratie). */}
      <div
        aria-hidden="true"
        className="mx-auto w-full max-w-sm rotate-[1.2deg] border-2 border-ink bg-white p-8 shadow-[9px_9px_0_var(--ink)]"
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
  <section aria-labelledby="afsluiting-titel" className={`${SECTIE} bg-[#f8f1eb]`}>
    <div className={`${CONTAINER} flex max-w-[800px] flex-col items-center text-center`}>
      <h2 id="afsluiting-titel" className={H2}>
        <KopTekst tekst={afsluiting.titel} />
      </h2>
      <p className="mt-0 mb-[30px] text-[19px] text-ink-soft">{afsluiting.tekst}</p>
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
