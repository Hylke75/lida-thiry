import type { ReactNode } from "react";
import { invoerBreed, kaart, tekstZacht } from "../stijl";
import { SEO_OMSCHRIJVING_MAX, SEO_TITEL_MAX } from "@/lib/blog/beheer";
import { Teller, Veld } from "./onderdelen";
import { googleAdres, kortAf } from "./regels";

/** Zo ongeveer toont Google het bericht of de pagina in de zoekresultaten. */
export function GoogleVoorbeeld({ titel, url, omschrijving }: { titel: string; url: string; omschrijving: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-black/10 bg-white p-4 font-sans dark:border-white/15">
      <p className="truncate text-xs text-[#4d5156]">{googleAdres(url)}</p>
      <p className="break-words text-lg leading-snug text-[#1a0dab]">{kortAf(titel || "(geen titel)", 60)}</p>
      <p className="break-words text-sm leading-snug text-[#4d5156]">{kortAf(omschrijving || "(geen omschrijving)", 158)}</p>
    </div>
  );
}

/** Kaart "Vindbaarheid in Google": SEO-titel, SEO-omschrijving en het Google-voorbeeld. */
export function SeoKaart({
  titel,
  seoTitel,
  seoOmschrijving,
  onSeoTitel,
  onSeoOmschrijving,
  url,
  omschrijving,
  leegUitleg,
  voorbeeldUitleg,
  children,
}: {
  titel: string;
  seoTitel: string;
  seoOmschrijving: string;
  onSeoTitel: (s: string) => void;
  onSeoOmschrijving: (s: string) => void;
  url: string;
  /** De omschrijving die Google te zien krijgt (met terugval op samenvatting of intro). */
  omschrijving: string;
  /** Uitleg bovenaan, over wat de site gebruikt als de velden leeg zijn. */
  leegUitleg: string;
  /** Tekst boven het Google-voorbeeld. */
  voorbeeldUitleg: string;
  /** Extra velden tussen de SEO-velden en het voorbeeld. */
  children?: ReactNode;
}) {
  return (
    <section className={kaart}>
      <h2 className="text-lg font-semibold">Vindbaarheid in Google</h2>
      <p className={`text-xs ${tekstZacht}`}>{leegUitleg}</p>
      <Veld label="SEO-titel" htmlFor="seo-titel" teller={<Teller waarde={seoTitel} max={SEO_TITEL_MAX} />}>
        <input id="seo-titel" value={seoTitel} maxLength={70} onChange={(e) => onSeoTitel(e.target.value)} className={invoerBreed} placeholder={titel} />
      </Veld>
      <Veld label="SEO-omschrijving" htmlFor="seo-omschrijving" teller={<Teller waarde={seoOmschrijving} max={SEO_OMSCHRIJVING_MAX} />}>
        <textarea id="seo-omschrijving" value={seoOmschrijving} maxLength={170} rows={3} onChange={(e) => onSeoOmschrijving(e.target.value)} className={invoerBreed} />
      </Veld>
      {children}
      <div className="flex min-w-0 flex-col gap-1">
        <span className={`text-xs ${tekstZacht}`}>{voorbeeldUitleg}</span>
        <GoogleVoorbeeld titel={seoTitel || titel} url={url} omschrijving={omschrijving} />
      </div>
    </section>
  );
}
