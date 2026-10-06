import Link from "next/link";
import { berichtBeeld, BerichtMeta } from "@/components/blog/BlogKaart";
import type { BlogBericht } from "@/lib/blog/regels";
import { BeeldPlek } from "./BeeldPlek";
import { Pijl, TekstLink } from "./Basis";
import { H3, KLEINE_LINK } from "./stijl";

// De artikelkaart uit het ontwerp (.article-card): foto 1,35:1, categorie in
// kapitalen (berry), seriftitel en "Lees verder →". Bewust zonder extra
// metadata (handboek: "geen overmatige metadata").

/** Categorie boven de titel (.article-card span). */
export const CATEGORIE = "m-0 text-[11px] leading-[1.65] font-extrabold tracking-[0.1em] text-berry uppercase";

const HOVER_TITEL = "hover:text-berry hover:underline hover:decoration-1 hover:underline-offset-4";

export function ArtikelKaart({
  bericht,
  kop = "h3",
  leesVerder = "Lees verder",
  sizes = "(min-width: 981px) 380px, 100vw",
  compact = false,
}: {
  bericht: Pick<BlogBericht, "slug" | "titel" | "categorie" | "omslag_url" | "omslag_alt" | "inhoud">;
  kop?: "h2" | "h3";
  leesVerder?: string;
  /** Getoonde breedte van de foto (next/image `sizes`). */
  sizes?: string;
  /** Kleinere titel en marge (smalle kolommen, bijv. binnen een pagina). */
  compact?: boolean;
}) {
  const Kop = kop;
  const beeld = berichtBeeld(bericht);
  const href = `/blog/${bericht.slug}`;
  return (
    <article className="group flex h-full flex-col overflow-hidden border border-line bg-white">
      <BeeldPlek
        src={beeld?.url}
        alt=""
        sizes={sizes}
        vlak="bg-sky"
        className="aspect-[1.35/1]"
        beeldKlasse="transition-transform duration-500 motion-safe:group-hover:scale-[1.035]"
      />
      <div className={`flex flex-1 flex-col items-start ${compact ? "p-5" : "p-6"}`}>
        {bericht.categorie && <p className={CATEGORIE}>{bericht.categorie}</p>}
        <Kop className={`${H3} mt-[10px] mb-5 text-balance break-words hyphens-auto ${compact ? "text-[22px]" : "text-[25px]"}`}>
          <Link href={href} className={HOVER_TITEL}>
            {bericht.titel}
          </Link>
        </Kop>
        {/* Dubbel met de titellink: alleen voor de muis, niet in de tabvolgorde. */}
        <Link href={href} tabIndex={-1} aria-hidden="true" className={`${KLEINE_LINK} mt-auto`}>
          {leesVerder} <Pijl />
        </Link>
      </div>
    </article>
  );
}

/** Raster van artikelkaarten (.article-grid): 3 kolommen op desktop, 2 op tablet, 1 op de telefoon. */
export function ArtikelRaster({
  berichten,
  kop = "h3",
  leesVerder,
  label,
}: {
  berichten: readonly BlogBericht[];
  kop?: "h2" | "h3";
  leesVerder?: string;
  /** Toegankelijke naam van de lijst (optioneel). */
  label?: string;
}) {
  return (
    <ul aria-label={label} className="m-0 grid list-none grid-cols-1 gap-5 p-0 tablet:grid-cols-2 desktop:grid-cols-3">
      {berichten.map((b) => (
        <li key={b.id}>
          <ArtikelKaart bericht={b} kop={kop} leesVerder={leesVerder} sizes="(min-width: 981px) 380px, (min-width: 641px) 50vw, 100vw" />
        </li>
      ))}
    </ul>
  );
}

/**
 * Het uitgelichte bericht bovenaan het blogoverzicht: dezelfde kaart, maar
 * breed (foto links, tekst rechts) met samenvatting, datum en leestijd.
 */
export function ArtikelUitgelicht({
  bericht,
  label,
  leesVerder = "Lees verder",
}: {
  bericht: BlogBericht;
  /** Bijv. "Uitgelicht". */
  label: string;
  leesVerder?: string;
}) {
  const beeld = berichtBeeld(bericht);
  const href = `/blog/${bericht.slug}`;
  return (
    <article className="group grid overflow-hidden border border-line bg-white desktop:grid-cols-[1.15fr_1fr]">
      <BeeldPlek
        src={beeld?.url}
        alt=""
        prioriteit
        sizes="(min-width: 981px) 630px, 100vw"
        vlak="bg-butter"
        className="aspect-[1.35/1] desktop:aspect-auto desktop:min-h-[400px]"
        beeldKlasse="transition-transform duration-500 motion-safe:group-hover:scale-[1.035]"
      />
      <div className="flex flex-col items-start justify-center p-6 tablet:p-10 desktop:p-12">
        <p className={`${CATEGORIE} flex flex-wrap items-center gap-x-3 gap-y-1`}>
          <span className="rounded-full bg-butter px-3 py-0.5 text-ink">{label}</span>
          {bericht.categorie && <span>{bericht.categorie}</span>}
        </p>
        <h2 className={`${H3} mt-4 mb-4 text-[30px] text-balance break-words hyphens-auto tablet:text-[40px]`}>
          <Link href={href} className={HOVER_TITEL}>
            {bericht.titel}
          </Link>
        </h2>
        {bericht.samenvatting && <p className="mt-0 mb-5 max-w-[520px] text-ink-soft">{bericht.samenvatting}</p>}
        <BerichtMeta bericht={bericht} className="mb-4" />
        <TekstLink href={href} pijl tabIndex={-1} aria-hidden="true" className="text-[14px]">
          {leesVerder}
        </TekstLink>
      </div>
    </article>
  );
}
