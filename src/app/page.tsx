import Link from "next/link";
import { leesPrijsCent, leesInstelling } from "@/lib/instellingen";
import { haalSilhouetten } from "@/lib/lichaamstypes";
import { STANDAARD_VORM } from "@/lib/lichaamstype-regels";
import { Lichaam } from "./test/[token]/Lichaam";
import { Opmaak } from "@/components/Opmaak";
import { leesSectie } from "@/lib/inhoud/lees";
import { vulIn } from "@/lib/inhoud/schema";
import {
  WEBSITE_ADVIES,
  WEBSITE_AFSLUITING,
  WEBSITE_BLOG,
  WEBSITE_ERVARINGEN,
  WEBSITE_FIGUURTYPES,
  WEBSITE_HERO,
  WEBSITE_OVER,
  WEBSITE_STAPPEN,
  WEBSITE_VRAGEN,
} from "@/lib/inhoud/groepen/website";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { NieuwsbriefAanmelden } from "@/components/NieuwsbriefAanmelden";
import { BlogKaart } from "@/components/blog/BlogKaart";
import { haalLaatste } from "@/lib/blog/publiek";

export const dynamic = "force-dynamic";

function formatteerPrijs(cent: number, valuta: string): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: valuta }).format(
    cent / 100,
  );
}

const TELWOORDEN = ["nul", "één", "twee", "drie", "vier", "vijf", "zes", "zeven", "acht", "negen", "tien"];
const telwoord = (n: number) => TELWOORDEN[n] ?? String(n);

export default async function Home() {
  const [SILHOUETTEN, hero, stappen, figuurtypes, advies, over, ervaringen, vragen, afsluiting, nieuwsbrief, blog, blogberichten] = await Promise.all([
    haalSilhouetten().catch(() => []),
    leesSectie(WEBSITE_HERO),
    leesSectie(WEBSITE_STAPPEN),
    leesSectie(WEBSITE_FIGUURTYPES),
    leesSectie(WEBSITE_ADVIES),
    leesSectie(WEBSITE_OVER),
    leesSectie(WEBSITE_ERVARINGEN),
    leesSectie(WEBSITE_VRAGEN),
    leesSectie(WEBSITE_AFSLUITING),
    leesSectie(NIEUWSBRIEF_AANMELDEN),
    leesSectie(WEBSITE_BLOG),
    haalLaatste(3),
  ]);
  const aantal = { aantal: telwoord(SILHOUETTEN.length) };
  const vorm = (i: number) => SILHOUETTEN[i]?.vorm ?? STANDAARD_VORM;
  let prijsLabel: string | null = null;
  try {
    const cent = await leesPrijsCent();
    const valuta = (await leesInstelling("valuta")) || "EUR";
    if (cent) prijsLabel = formatteerPrijs(cent, valuta);
  } catch {
    prijsLabel = null;
  }

  const ctaTekst = prijsLabel ? `${hero.knop} — ${prijsLabel}` : hero.knop;

  return (
    <main className="flex w-full flex-1 flex-col">
      {/* Hero */}
      <section className="bg-accent-zacht/60">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-6 py-16 sm:py-24 md:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6 text-center md:text-left">
            <span className="mx-auto w-fit rounded-full border border-accent/30 px-3 py-1 text-xs font-medium uppercase tracking-widest text-accent md:mx-0">
              {hero.bovenschrift}
            </span>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              {hero.titel}
            </h1>
            <p className="text-balance text-lg text-foreground/70">{hero.intro}</p>
            <div className="flex flex-col items-center gap-3 md:items-start">
              <Link
                href="/bestellen"
                className="rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90"
              >
                {ctaTekst}
              </Link>
              {prijsLabel ? (
                <p className="text-xs text-foreground/50">{hero.prijsregel}</p>
              ) : (
                <p className="text-xs text-foreground/50">{hero.geenPrijs}</p>
              )}
            </div>
          </div>
          <div className="mx-auto flex items-end gap-2" aria-hidden="true">
            <Lichaam vorm={vorm(1)} armen={false} titel="" className="h-56 w-auto opacity-70 sm:h-64" />
            <Lichaam vorm={vorm(0)} armen={false} titel="" className="h-64 w-auto sm:h-80" />
            <Lichaam vorm={vorm(2)} armen={false} titel="" className="h-56 w-auto opacity-70 sm:h-64" />
          </div>
        </div>
      </section>

      {/* Zo werkt het */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight">{stappen.titel}</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {stappen.stappen.map((s, i) => (
            <li key={s._id} className="flex flex-col gap-3 rounded-2xl bg-kaart p-6 shadow-sm ring-1 ring-foreground/5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-zacht font-semibold text-accent">
                {i + 1}
              </span>
              <h3 className="text-lg font-semibold">{s.titel}</h3>
              <p className="text-sm text-foreground/70">{s.tekst}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Figuurtypes */}
      <section className="bg-kaart">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <h2 className="text-center text-3xl font-semibold tracking-tight">{vulIn(figuurtypes.titel, aantal)}</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-foreground/70">{vulIn(figuurtypes.intro, aantal)}</p>
          <ul className="mt-10 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
            {SILHOUETTEN.map((s) => (
              <li key={s.letter} className="flex flex-col items-center gap-2 text-center">
                <div className="flex w-full justify-center rounded-2xl bg-accent-zacht/50 py-4">
                  <Lichaam
                    vorm={s.vorm}
                    armen={false}
                    titel={`Silhouet ${s.naam}`}
                    className="h-40 w-auto"
                  />
                </div>
                <h3 className="mt-1 font-semibold">{s.naam}</h3>
                <p className="text-sm text-foreground/60">{s.omschrijving}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Wat zit er in je advies */}
      <section className="mx-auto grid w-full max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">{advies.titel}</h2>
          <p className="mt-3 text-foreground/70">{advies.intro}</p>
          <ul className="mt-6 flex flex-col gap-3">
            {advies.punten.map((punt) => (
              <li key={punt._id} className="flex gap-3">
                <span className="mt-2 h-2 w-2 flex-none rounded-full bg-accent" aria-hidden="true" />
                <span>{punt.tekst}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Schematisch voorbeeld van de PDF */}
        <div className="mx-auto w-full max-w-sm rotate-1 rounded-xl bg-kaart p-8 shadow-lg ring-1 ring-foreground/10" aria-hidden="true">
          <p className="text-[10px] uppercase tracking-widest text-accent">Lida Thiry · Imago &amp; Kledingadvies</p>
          <p className="mt-4 font-serif text-2xl">Jouw persoonlijke kledingadvies</p>
          <p className="mt-1 font-serif text-lg text-accent">Type X — Zandloper</p>
          <div className="mt-6 flex gap-4">
            <Lichaam vorm={vorm(0)} armen={false} titel="" className="h-28 w-auto flex-none" />
            <div className="flex flex-1 flex-col gap-2 pt-2">
              <div className="h-2 w-full rounded bg-foreground/10" />
              <div className="h-2 w-5/6 rounded bg-foreground/10" />
              <div className="h-2 w-4/6 rounded bg-foreground/10" />
              <div className="mt-3 h-2 w-1/2 rounded bg-accent/40" />
              <div className="h-2 w-full rounded bg-foreground/10" />
              <div className="h-2 w-3/4 rounded bg-foreground/10" />
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-foreground/40">Voorbeeldweergave</p>
        </div>
      </section>

      {/* Over Lida */}
      <section className="bg-accent-zacht/60">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-6 py-16 md:grid-cols-[1fr_2fr]">
          <div
            className="mx-auto flex aspect-square w-48 items-center justify-center rounded-full bg-kaart font-serif text-5xl text-accent ring-1 ring-accent/20"
            aria-hidden="true"
          >
            {over.initialen}
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">{over.titel}</h2>
            <div className="mt-4 flex flex-col gap-3 text-foreground/80 [&_a]:text-accent [&_a]:underline [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
              <Opmaak tekst={over.tekst} />
            </div>
          </div>
        </div>
      </section>

      {/* Ervaringen (alleen als er echte ervaringen zijn ingevuld) */}
      {ervaringen.ervaringen.length > 0 && (
        <section className="mx-auto w-full max-w-5xl px-6 py-16">
          <h2 className="text-center text-3xl font-semibold tracking-tight">{ervaringen.titel}</h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-3">
            {ervaringen.ervaringen.map((e) => (
              <li key={e._id} className="flex flex-col gap-4 rounded-2xl bg-kaart p-6 shadow-sm ring-1 ring-foreground/5">
                <span className="font-serif text-4xl leading-none text-accent" aria-hidden="true">
                  &ldquo;
                </span>
                <blockquote className="-mt-4 text-foreground/80">{e.citaat}</blockquote>
                <p className="mt-auto text-sm text-foreground/50">{e.naam}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Laatste blogberichten (alleen als er gepubliceerde berichten zijn) */}
      {blogberichten.length > 0 && (
        <section aria-labelledby="laatste-blog" className="bg-accent-zacht/40">
          <div className="mx-auto w-full max-w-5xl px-6 py-16">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
              <h2 id="laatste-blog" className="text-3xl font-semibold tracking-tight">
                {blog.titel}
              </h2>
              <Link
                href="/blog"
                className="text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:underline"
              >
                {blog.linktekst} →
              </Link>
            </div>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {blogberichten.map((b) => (
                <li key={b.id}>
                  <BlogKaart bericht={b} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Nieuwsbrief */}
      <section id="nieuwsbrief" className="mx-auto w-full max-w-5xl scroll-mt-8 px-6 py-16">
        <NieuwsbriefAanmelden teksten={nieuwsbrief} toestemming={<Opmaak tekst={nieuwsbrief.toestemming_tekst} />} />
      </section>

      {/* Veelgestelde vragen */}
      <section className="bg-kaart">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <h2 className="text-center text-3xl font-semibold tracking-tight">{vragen.titel}</h2>
          <div className="mt-8 divide-y divide-foreground/10 border-y border-foreground/10">
            {vragen.vragen.map((v) => (
              <details key={v._id} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {v.vraag}
                  <span className="text-xl text-accent transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 whitespace-pre-line text-foreground/70">{v.antwoord}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Afsluitende CTA */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {afsluiting.titel}
        </h2>
        <p className="text-foreground/70">{afsluiting.tekst}</p>
        <Link
          href="/bestellen"
          className="rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90"
        >
          {ctaTekst}
        </Link>
      </section>
    </main>
  );
}
