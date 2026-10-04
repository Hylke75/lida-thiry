import Link from "next/link";
import { eersteAfbeelding, leestijdMinuten, type BlogBericht } from "@/lib/blog/regels";
import { formatteerDatum } from "@/lib/blog/lijst";

/** De afbeelding bij een bericht: omslag, anders de eerste foto uit de tekst. */
export function berichtBeeld(b: Pick<BlogBericht, "omslag_url" | "omslag_alt" | "inhoud" | "titel">) {
  if (b.omslag_url) return { url: b.omslag_url, alt: b.omslag_alt || b.titel };
  return eersteAfbeelding(b.inhoud);
}

/**
 * Omslagbeeld met vaste verhouding (geen verspringende pagina). Gewone <img>:
 * de foto's staan in de openbare Supabase-bucket, maar een omslag mag ook een
 * ander https-adres zijn. next/image zou dan een fout geven voor onbekende hosts.
 * Zonder foto tonen we een rustige, gestileerde vlakvulling in de huisstijl.
 */
export function BlogBeeld({
  bericht,
  className = "",
  prioriteit = false,
  decoratief = false,
}: {
  bericht: Pick<BlogBericht, "omslag_url" | "omslag_alt" | "inhoud" | "titel" | "categorie">;
  className?: string;
  prioriteit?: boolean;
  /** Op kaarten staat de titel er al naast: dan is de foto decoratief voor schermlezers. */
  decoratief?: boolean;
}) {
  const beeld = berichtBeeld(bericht);
  if (beeld) {
    return (
      <div className={`overflow-hidden bg-accent-zacht ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- foto's met vrije herkomst (zie hierboven) */}
        <img
          src={beeld.url}
          alt={decoratief ? "" : beeld.alt}
          loading={prioriteit ? "eager" : "lazy"}
          fetchPriority={prioriteit ? "high" : undefined}
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
    );
  }
  const letter = (bericht.categorie || bericht.titel || "L").trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-accent-zacht via-accent-zacht/70 to-kaart ${className}`}
    >
      <span className="absolute -right-6 -bottom-10 h-40 w-40 rounded-full border border-accent/20" />
      <span className="absolute -top-8 -left-8 h-28 w-28 rounded-full bg-accent/10" />
      <span className="font-serif text-6xl text-accent/60 italic">{letter}</span>
    </div>
  );
}

/** Regel met datum en leestijd. */
export function BerichtMeta({ bericht, className = "" }: { bericht: BlogBericht; className?: string }) {
  const minuten = leestijdMinuten(bericht.inhoud);
  return (
    <p className={`flex flex-wrap items-center gap-x-2 text-xs text-foreground/50 ${className}`}>
      {bericht.gepubliceerd_op && <time dateTime={bericht.gepubliceerd_op}>{formatteerDatum(bericht.gepubliceerd_op)}</time>}
      <span aria-hidden="true">·</span>
      <span>{minuten} min lezen</span>
    </p>
  );
}

/** Kaart in het overzicht, op de homepage en bij "Lees ook". De hele kaart is klikbaar. */
export function BlogKaart({ bericht, kop = "h3" }: { bericht: BlogBericht; kop?: "h2" | "h3" }) {
  const Kop = kop;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl bg-kaart shadow-sm ring-1 ring-foreground/5 transition-shadow focus-within:ring-2 focus-within:ring-accent hover:shadow-md">
      <BlogBeeld bericht={bericht} decoratief className="aspect-[3/2] w-full" />
      <div className="flex flex-1 flex-col gap-2 p-5">
        {bericht.categorie && (
          <p className="text-xs font-medium tracking-widest text-accent uppercase">{bericht.categorie}</p>
        )}
        <Kop className="font-serif text-xl leading-snug font-semibold text-balance break-words hyphens-auto">
          <Link
            href={`/blog/${bericht.slug}`}
            className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
          >
            {bericht.titel}
          </Link>
        </Kop>
        {bericht.samenvatting && <p className="line-clamp-3 text-sm text-foreground/70">{bericht.samenvatting}</p>}
        <BerichtMeta bericht={bericht} className="mt-auto pt-2" />
      </div>
    </article>
  );
}
