import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SilhouetVlak, vlakKleur } from "@/components/figuur/SilhouetVlak";
import { Bovenschrift, Container, knopKlassen, KopTekst, SectieIntro, SectieKop, TekstLink } from "@/components/site/Basis";
import { H1_INHOUD, INTRO, KOP_ACHTERGROND } from "@/components/site/InhoudKop";
import { KlantVinklijst } from "@/components/site/KlantPagina";
import { CONTAINER, H3, SECTIE } from "@/components/site/stijl";
import { adviesDownloadbaar } from "@/lib/advies-toegang";
import { andereTypes, figuurtypeSleutel, vergelijkMetEigen, verhoudingen } from "@/lib/figuurtype-weergave";
import { TEST_FIGUURTYPE, TEST_UITSLAG } from "@/lib/inhoud/groepen/test";
import { leesSectie } from "@/lib/inhoud/lees";
import { vulIn } from "@/lib/inhoud/schema";
import { ontleedTypeSleutel } from "@/lib/lichaamstype-regels";
import { haalSilhouetten, silhouetVoorSleutel } from "@/lib/lichaamstypes";
import { beoordeelToken } from "@/lib/test-order";
import { CATEGORIE_TABEL } from "@/rekenkern/config/categorie-tabel";

// "Jouw figuurtype": uitleg over het figuurtype van de klant, alleen via de
// persoonlijke testlink van een betaalde bestelling met een afgeronde test
// (achter de betaalmuur; niet in het menu, de sitemap of zoekmachines). Elke
// andere link geeft een 404. Per request: de toegang hangt af van de bestelling,
// en foto's uit de beeldbank hebben een tijdelijke (ondertekende) URL.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jouw figuurtype",
  robots: { index: false, follow: false },
};

type Params = Promise<{ token: string }>;

export default async function FiguurtypePagina({ params }: { params: Params }) {
  const { token } = await params;
  const beoordeling = await beoordeelToken(token);
  const sleutel = figuurtypeSleutel(beoordeling);
  if (!sleutel || beoordeling.toestand !== "al_afgerond") notFound();
  const order = beoordeling.order;

  const [eigen, actief, t, uitslag] = await Promise.all([
    silhouetVoorSleutel(sleutel),
    haalSilhouetten(),
    leesSectie(TEST_FIGUURTYPE),
    leesSectie(TEST_UITSLAG),
  ]);
  if (!eigen) notFound();

  const categorie = CATEGORIE_TABEL.find((c) => c.nummer === ontleedTypeSleutel(sleutel)?.categorie)?.titel ?? "";
  const anderen = andereTypes(eigen, actief);
  const downloadbaar = adviesDownloadbaar(order);
  const testHref = `/test/${encodeURIComponent(token)}`;
  const pdfHref = `/api/test/${encodeURIComponent(token)}/pdf`;
  const verhouding = verhoudingen(eigen.vorm);

  return (
    <main className="flex w-full flex-1 flex-col bg-paper">
      {/* Kop: het silhouet in een rustig kader naast naam en korte omschrijving. */}
      <header className={`${KOP_ACHTERGROND} border-b border-line`}>
        <div className={`${CONTAINER} grid grid-cols-1 items-center gap-10 pt-10 pb-14 tablet:pt-14 tablet:pb-16 desktop:grid-cols-[.9fr_1.1fr] desktop:gap-16`}>
          <div className="relative mx-auto w-full max-w-[460px] desktop:order-none">
            <SilhouetVlak
              silhouet={eigen}
              titel={`Silhouet: ${eigen.naam}`}
              kleur="coral"
              schaduw
              className="aspect-square w-full"
              figuurKlasse="h-[78%]"
            />
          </div>
          <div className="flex flex-col items-start gap-5">
            <TekstLink href={testHref} className="text-[15px]">
              ← {t.terug_link}
            </TekstLink>
            <div>
              <Bovenschrift>{vulIn(t.bovenschrift, { naam: order.klantnaam })}</Bovenschrift>
              <h1 className={H1_INHOUD}>{eigen.naam}</h1>
              {eigen.alias && <p className="mt-2 mb-0 text-[17px] text-ink-soft">ook wel {eigen.alias}</p>}
            </div>
            {eigen.omschrijving && <p className={INTRO}>{eigen.omschrijving}</p>}
            <p className="m-0 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-1.5 text-[15px] font-bold text-ink-soft">
              Typecode <span className="text-ink">{sleutel}</span>
              {categorie && (
                <>
                  <span aria-hidden="true">·</span> {categorie}
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Kenmerken en verhoudingen. */}
      <section aria-labelledby="kenmerken-titel" className={SECTIE}>
        <div className={`${CONTAINER} grid grid-cols-1 gap-10 desktop:grid-cols-[1.2fr_.8fr] desktop:gap-16`}>
          <div className="max-w-[680px]">
            <h2 id="kenmerken-titel" className={`${H3} mb-5 text-[34px] tablet:text-[40px]`}>
              {t.kenmerken_kop}
            </h2>
            {eigen.uitleg && <p className="mt-0 mb-6 text-[18px] whitespace-pre-line text-ink-soft">{eigen.uitleg}</p>}
            <KlantVinklijst punten={eigen.kenmerken} />
          </div>
          <aside aria-labelledby="verhoudingen-titel" className="self-start rounded-[8px] border border-line border-t-2 border-t-coral bg-white p-6 tablet:p-8">
            <h2 id="verhoudingen-titel" className={`${H3} mb-4 text-[26px]`}>
              {t.verhoudingen_kop}
            </h2>
            <ul className="m-0 grid list-none gap-3 p-0">
              {verhouding.map((zin) => (
                <li key={zin} className="flex gap-3 text-[17px] text-ink-soft">
                  <span aria-hidden="true" className="mt-[9px] h-2 w-2 flex-none rounded-full bg-coral" />
                  {zin}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </section>

      {/* Het eigen type tussen de andere figuurtypes. */}
      {anderen.length > 0 && (
        <section aria-labelledby="anderen-titel" className={`${SECTIE} bg-cream`}>
          <Container>
            <SectieKop id="anderen-titel" titel={t.anderen_kop} rechts={t.anderen_intro.trim() ? <SectieIntro>{t.anderen_intro}</SectieIntro> : undefined} />
            <ul className="m-0 grid list-none grid-cols-1 gap-[18px] p-0 min-[480px]:grid-cols-2 desktop:grid-cols-3">
              <li>
                <article aria-current="true" className="flex h-full flex-col items-center gap-3 rounded-ontwerp-md border-2 border-berry bg-white p-6 text-center">
                  <p className="m-0 rounded-full bg-berry px-3 py-0.5 text-[12px] font-extrabold tracking-[0.1em] text-white uppercase">{t.jouw_type_label}</p>
                  <SilhouetVlak silhouet={{ vorm: eigen.vorm }} titel="" kleur="coral" className="h-44 w-36" figuurKlasse="h-36" />
                  <h3 className={`${H3} m-0 text-[26px]`}>{eigen.naam}</h3>
                  {eigen.omschrijving && <p className="m-0 text-[16px] text-ink-soft">{eigen.omschrijving}</p>}
                </article>
              </li>
              {anderen.map((s, i) => (
                <li key={s.letter}>
                  <article className="flex h-full flex-col items-center gap-3 rounded-ontwerp-md border border-line bg-white p-6 text-center">
                    <SilhouetVlak silhouet={{ vorm: s.vorm }} titel="" kleur={vlakKleur(i + 1)} variant={i % 2 === 0 ? 1 : 0} className="mt-[30px] h-44 w-36" figuurKlasse="h-36" />
                    <h3 className={`${H3} m-0 text-[26px]`}>{s.naam}</h3>
                    {s.omschrijving && <p className="m-0 text-[16px] text-ink-soft">{s.omschrijving}</p>}
                    <p className="mt-auto mb-0 border-t border-line pt-3 text-[14px] font-bold text-ink">{vergelijkMetEigen(eigen.vorm, s.vorm)}</p>
                  </article>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {/* Wat er in het advies staat (algemeen) en de download. */}
      <section aria-labelledby="advies-titel" className={SECTIE}>
        <div className={`${CONTAINER} grid grid-cols-1 items-center gap-10 desktop:grid-cols-[1.1fr_.9fr] desktop:gap-16`}>
          <div className="max-w-[640px]">
            <h2 id="advies-titel" className={`${H3} mb-5 text-[34px] tablet:text-[40px]`}>
              {t.advies_kop}
            </h2>
            {t.advies_intro.trim() && (
              <p className="mt-0 mb-6 text-[18px] text-ink-soft">{vulIn(t.advies_intro, { categorie: categorie || "jouw lengte en postuur" })}</p>
            )}
            <KlantVinklijst punten={t.advies_punten.map((p) => p.tekst)} />
          </div>
          <aside className="relative overflow-hidden rounded-[8px] border border-line bg-sand px-6 py-10 text-center tablet:px-12 tablet:py-12">
            <p className="mx-auto mt-0 mb-3 max-w-[460px] font-serif text-[32px] leading-[1.08] text-balance text-ink tablet:text-[38px]">
              <KopTekst tekst={t.download_kop} />
            </p>
            {downloadbaar ? (
              <>
                <p className="mx-auto mt-0 mb-7 max-w-[420px] text-[17px] text-ink-soft">{t.download_tekst}</p>
                <a href={pdfHref} className={knopKlassen()}>
                  {uitslag.download_knop}
                </a>
              </>
            ) : (
              <p className="mx-auto m-0 max-w-[420px] text-ink-soft">{t.niet_klaar_tekst}</p>
            )}
          </aside>
        </div>
      </section>

      <nav aria-label="Verder" className={`${CONTAINER} flex flex-col items-start gap-1 pb-16 text-[15px] tablet:flex-row tablet:items-center tablet:justify-between`}>
        <TekstLink href={testHref}>← {t.terug_link}</TekstLink>
        <TekstLink href="/mijn-advies" className="font-semibold text-ink-soft">
          {t.kwijt_tekst}
        </TekstLink>
      </nav>
    </main>
  );
}
