import Link from "next/link";
import { leesPrijsCent, leesInstelling } from "@/lib/instellingen";
import { SILHOUETTEN } from "@/lib/test-config";
import { Lichaam } from "./test/[token]/Lichaam";

export const dynamic = "force-dynamic";

function formatteerPrijs(cent: number, valuta: string): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: valuta }).format(
    cent / 100,
  );
}

const STAPPEN = [
  {
    titel: "Bestel en betaal veilig",
    tekst: "Je rekent eenvoudig af via iDEAL of een andere betaalmethode. Direct daarna kun je beginnen.",
  },
  {
    titel: "Meet jezelf op",
    tekst: "Met een meetlint en duidelijke illustraties vul je je lengte, maten en een paar vragen over je figuur in.",
  },
  {
    titel: "Ontvang je persoonlijke advies",
    tekst: "Je krijgt meteen je figuurtype te zien en ontvangt je persoonlijke kledingadvies als PDF in je mailbox.",
  },
];

const IN_HET_ADVIES = [
  "Jouw figuurtype, met uitleg over wat dat betekent voor je verhoudingen",
  "Welke snitten, lengtes en pasvormen jouw figuur mooi laten uitkomen",
  "Tips voor broeken, rokken, jurken, jasjes en tops",
  "Wat je beter kunt vermijden, en waarom",
  "Een overzicht van je eigen maten om bij het winkelen te gebruiken",
];

// Voorbeeldteksten: vervangen door echte (en met toestemming gebruikte) reacties.
const ERVARINGEN = [
  {
    citaat: "Eindelijk begrijp ik waarom sommige broeken nooit lekker zitten. Het advies was heel herkenbaar en praktisch.",
    naam: "Voorbeeld — klant 1",
  },
  {
    citaat: "Het meten was makkelijker dan ik dacht, en ik had binnen een paar minuten mijn advies in de mail.",
    naam: "Voorbeeld — klant 2",
  },
  {
    citaat: "Ik winkel nu veel gerichter. Mijn kast is kleiner, maar ik draag alles wat erin hangt.",
    naam: "Voorbeeld — klant 3",
  },
];

const VRAGEN = [
  {
    vraag: "Hoe lang duurt de test?",
    antwoord:
      "Reken op ongeveer 15 tot 20 minuten. Het meeste daarvan gaat zitten in het opmeten; de vragen zelf zijn zo beantwoord.",
  },
  {
    vraag: "Wat heb ik nodig?",
    antwoord:
      "Een flexibel meetlint (zo'n zacht lint van de naaidoos) en bij voorkeur iemand die je even helpt met meten. Draag dunne, nauwsluitende kleding of meet in je ondergoed: dan zijn de maten het nauwkeurigst.",
  },
  {
    vraag: "Wat krijg ik precies?",
    antwoord:
      "Na het invullen zie je direct je figuurtype. Daarnaast ontvang je een persoonlijke PDF met uitleg over je type en concreet kledingadvies: welke snitten, lengtes en pasvormen bij je passen, en wat je beter kunt laten hangen.",
  },
  {
    vraag: "Wat gebeurt er met mijn maten?",
    antwoord:
      "Je maten gebruiken we alleen om jouw advies te maken. Ze worden beveiligd opgeslagen in de EU en na een vaste termijn geanonimiseerd. Meer lees je in de privacyverklaring.",
  },
  {
    vraag: "Kan ik de test later doen of verder gaan?",
    antwoord:
      "Ja. Na je betaling ontvang je je persoonlijke testlink ook per e-mail. Zo kun je de test starten op een moment dat het jou uitkomt, bijvoorbeeld wanneer er iemand is die je kan helpen met meten.",
  },
];

export default async function Home() {
  let prijsLabel: string | null = null;
  try {
    const cent = await leesPrijsCent();
    const valuta = (await leesInstelling("valuta")) || "EUR";
    if (cent) prijsLabel = formatteerPrijs(cent, valuta);
  } catch {
    prijsLabel = null;
  }

  const ctaTekst = prijsLabel ? `Start de test — ${prijsLabel}` : "Start de test";

  return (
    <main className="flex w-full flex-1 flex-col">
      {/* Hero */}
      <section className="bg-accent-zacht/60">
        <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-6 py-16 sm:py-24 md:grid-cols-[1.4fr_1fr]">
          <div className="flex flex-col gap-6 text-center md:text-left">
            <span className="mx-auto w-fit rounded-full border border-accent/30 px-3 py-1 text-xs font-medium uppercase tracking-widest text-accent md:mx-0">
              Lida Thiry · Imago &amp; Kledingadvies
            </span>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
              Ontdek je figuurtype en kleed je zoals het bij jou past
            </h1>
            <p className="text-balance text-lg text-foreground/70">
              Doe de online kledingadviestest op basis van je lengte, maten en een
              paar vragen over je figuur. Je ziet direct je figuurtype en ontvangt
              een persoonlijk advies als PDF.
            </p>
            <div className="flex flex-col items-center gap-3 md:items-start">
              <Link
                href="/bestellen"
                className="rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90"
              >
                {ctaTekst}
              </Link>
              {prijsLabel ? (
                <p className="text-xs text-foreground/50">Eenmalig, inclusief btw · direct beginnen</p>
              ) : (
                <p className="text-xs text-foreground/50">De prijs wordt binnenkort bekendgemaakt.</p>
              )}
            </div>
          </div>
          <div className="mx-auto flex items-end gap-2" aria-hidden="true">
            <Lichaam vorm={SILHOUETTEN[1].vorm} armen={false} titel="" className="h-56 w-auto opacity-70 sm:h-64" />
            <Lichaam vorm={SILHOUETTEN[0].vorm} armen={false} titel="" className="h-64 w-auto sm:h-80" />
            <Lichaam vorm={SILHOUETTEN[2].vorm} armen={false} titel="" className="h-56 w-auto opacity-70 sm:h-64" />
          </div>
        </div>
      </section>

      {/* Zo werkt het */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Zo werkt het</h2>
        <ol className="mt-10 grid gap-6 md:grid-cols-3">
          {STAPPEN.map((s, i) => (
            <li key={s.titel} className="flex flex-col gap-3 rounded-2xl bg-kaart p-6 shadow-sm ring-1 ring-foreground/5">
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
          <h2 className="text-center text-3xl font-semibold tracking-tight">De vijf figuurtypes</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-foreground/70">
            Ieder lichaam is anders, maar de verhoudingen tussen schouders, taille en
            heupen vallen grofweg in vijf types. De test bepaalt welk type het beste bij
            jou past.
          </p>
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
          <h2 className="text-3xl font-semibold tracking-tight">Wat zit er in je persoonlijke advies?</h2>
          <p className="mt-3 text-foreground/70">
            Je advies is geen algemeen lijstje, maar afgestemd op jouw maten en
            antwoorden. Je ontvangt het als overzichtelijke PDF die je kunt bewaren,
            printen of meenemen als je gaat winkelen.
          </p>
          <ul className="mt-6 flex flex-col gap-3">
            {IN_HET_ADVIES.map((punt) => (
              <li key={punt} className="flex gap-3">
                <span className="mt-2 h-2 w-2 flex-none rounded-full bg-accent" aria-hidden="true" />
                <span>{punt}</span>
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
            <Lichaam vorm={SILHOUETTEN[0].vorm} armen={false} titel="" className="h-28 w-auto flex-none" />
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
            LT
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight">Over Lida</h2>
            <p className="mt-4 text-foreground/80">
              Ik ben Lida Thiry, imago- en kledingadviseur. [aan te vullen: korte
              introductie — achtergrond, opleiding en hoeveel jaar ervaring.]
            </p>
            <p className="mt-3 text-foreground/80">
              [aan te vullen: waarom je dit werk doet en wat je klanten wilt meegeven,
              bijvoorbeeld: &ldquo;Ik geloof dat iedere vrouw zich goed kan voelen in
              haar kleding, als ze weet wat bij haar figuur past.&rdquo;]
            </p>
            <p className="mt-3 text-foreground/80">
              Deze online test is gebaseerd op de methode die ik ook in mijn
              persoonlijke adviesgesprekken gebruik.
            </p>
          </div>
        </div>
      </section>

      {/* Ervaringen */}
      <section className="mx-auto w-full max-w-5xl px-6 py-16">
        <h2 className="text-center text-3xl font-semibold tracking-tight">Ervaringen</h2>
        <p className="mt-2 text-center text-xs uppercase tracking-widest text-foreground/40">
          Voorbeeldteksten — worden vervangen door echte ervaringen
        </p>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {ERVARINGEN.map((e) => (
            <li key={e.naam} className="flex flex-col gap-4 rounded-2xl bg-kaart p-6 shadow-sm ring-1 ring-foreground/5">
              <span className="font-serif text-4xl leading-none text-accent" aria-hidden="true">
                &ldquo;
              </span>
              <blockquote className="-mt-4 text-foreground/80">{e.citaat}</blockquote>
              <p className="mt-auto text-sm text-foreground/50">{e.naam}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Veelgestelde vragen */}
      <section className="bg-kaart">
        <div className="mx-auto w-full max-w-3xl px-6 py-16">
          <h2 className="text-center text-3xl font-semibold tracking-tight">Veelgestelde vragen</h2>
          <div className="mt-8 divide-y divide-foreground/10 border-y border-foreground/10">
            {VRAGEN.map((v) => (
              <details key={v.vraag} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {v.vraag}
                  <span className="text-xl text-accent transition-transform group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-foreground/70">{v.antwoord}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Afsluitende CTA */}
      <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Klaar om te ontdekken wat bij jou past?
        </h2>
        <p className="text-foreground/70">
          Pak een meetlint, vraag iemand om je te helpen en ontvang vandaag nog je
          persoonlijke kledingadvies.
        </p>
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
