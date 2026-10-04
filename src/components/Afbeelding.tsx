import Image from "next/image";
import { isOptimaliseerbaar } from "@/lib/media/afbeelding";

// Eén plek die kiest tussen next/image (verkleind, WebP/AVIF, zonder EXIF, lazy)
// en een gewone <img> voor adressen die next/image niet mag bewerken (andere
// sites, SVG/ICO/GIF; zie lib/media/afbeelding.ts). Werkt in server- én
// client-componenten.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

interface Basis {
  src: string;
  alt: string;
  className?: string;
  /** Hoe breed de afbeelding op het scherm staat (zie next/image `sizes`). */
  sizes?: string;
  /** Boven in beeld (LCP): meteen laden met hoge prioriteit. */
  prioriteit?: boolean;
}

type Props =
  | (Basis & { /** Vult de (relatief gepositioneerde) ouder, bijv. een kader met vaste verhouding. */ vullen: true })
  | (Basis & { vullen?: false; breedte?: number | null; hoogte?: number | null });

export function Afbeelding(props: Props) {
  const { src, alt, className, sizes, prioriteit = false } = props;
  const laden = prioriteit ? ({ loading: "eager", fetchPriority: "high" } as const) : ({ loading: "lazy" } as const);
  const optimaliseer = isOptimaliseerbaar(src, SUPABASE_URL);

  if (props.vullen) {
    if (optimaliseer) return <Image src={src} alt={alt} fill sizes={sizes ?? "100vw"} className={className} {...laden} />;
    // eslint-disable-next-line @next/next/no-img-element -- adres dat next/image niet mag bewerken (zie boven)
    return <img src={src} alt={alt} decoding="async" className={`absolute inset-0 h-full w-full ${className ?? ""}`} {...laden} />;
  }
  const { breedte, hoogte } = props;
  if (optimaliseer && breedte && hoogte) {
    return <Image src={src} alt={alt} width={breedte} height={hoogte} sizes={sizes} className={className} {...laden} />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- onbekende afmetingen of extern adres
  return <img src={src} alt={alt} decoding="async" width={breedte ?? undefined} height={hoogte ?? undefined} className={className} {...laden} />;
}
