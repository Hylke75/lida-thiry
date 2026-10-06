import { Afbeelding } from "@/components/Afbeelding";
import { eersteAfbeelding, leestijdMinuten, type BlogBericht } from "@/lib/blog/regels";
import { formatteerDatum } from "@/lib/blog/lijst";

/** De afbeelding bij een bericht: omslag, anders de eerste foto uit de tekst. */
export function berichtBeeld(b: Pick<BlogBericht, "omslag_url" | "omslag_alt" | "inhoud" | "titel">) {
  if (b.omslag_url) return { url: b.omslag_url, alt: b.omslag_alt || b.titel };
  return eersteAfbeelding(b.inhoud);
}

/** Breedte van een kaart in het raster (3 / 2 / 1 kolommen). */
const KAART_SIZES = "(min-width: 981px) 380px, (min-width: 641px) 50vw, 100vw";

/**
 * Omslagbeeld met vaste verhouding (geen verspringende pagina). Foto's uit onze
 * eigen opslag gaan via next/image (verkleind tot de getoonde breedte, WebP/AVIF,
 * lazy); een omslag van een ander https-adres blijft een gewone <img> (zie
 * components/Afbeelding.tsx). Zonder foto tonen we een rustige, gestileerde
 * effen warm-neutrale vlakvulling (geen patroon, geen letter).
 */
export function BlogBeeld({
  bericht,
  className = "",
  prioriteit = false,
  decoratief = false,
  sizes = KAART_SIZES,
}: {
  bericht: Pick<BlogBericht, "omslag_url" | "omslag_alt" | "inhoud" | "titel" | "categorie">;
  className?: string;
  prioriteit?: boolean;
  /** Op kaarten staat de titel er al naast: dan is de foto decoratief voor schermlezers. */
  decoratief?: boolean;
  /** Getoonde breedte (next/image `sizes`); standaard die van een kaart. */
  sizes?: string;
}) {
  const beeld = berichtBeeld(bericht);
  if (beeld) {
    return (
      <div className={`relative overflow-hidden bg-sand-deep ${className}`}>
        <Afbeelding
          vullen
          src={beeld.url}
          alt={decoratief ? "" : beeld.alt}
          sizes={sizes}
          prioriteit={prioriteit}
          className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      </div>
    );
  }
  // Effen warm-neutraal vlak, zoals een lege fotoplek (zie site/BeeldPlek).
  return <div aria-hidden="true" className={`relative overflow-hidden bg-sand-deep ${className}`} />;
}

/** Regel met datum en leestijd. */
export function BerichtMeta({ bericht, className = "" }: { bericht: BlogBericht; className?: string }) {
  const minuten = leestijdMinuten(bericht.inhoud);
  return (
    <p className={`flex flex-wrap items-center gap-x-2 text-[14px] font-semibold text-ink-soft ${className}`}>
      {bericht.gepubliceerd_op && <time dateTime={bericht.gepubliceerd_op}>{formatteerDatum(bericht.gepubliceerd_op)}</time>}
      <span aria-hidden="true">·</span>
      <span>{minuten} min lezen</span>
    </p>
  );
}
