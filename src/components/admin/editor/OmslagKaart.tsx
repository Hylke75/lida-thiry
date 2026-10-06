import type { ReactNode } from "react";
import { MediaKiezer } from "../MediaKiezer";
import { invoerBreed, kaart, knopSecundair } from "../stijl";
import { FotoUpload } from "./FotoUpload";
import type { EditorUploadSoort } from "./upload-actie";
import { Teller, Veld } from "./onderdelen";
import { omslagUitBibliotheek, toonbareOmslag } from "./regels";

type Omslag = { omslag_url: string; omslag_alt: string };

/** Kaart voor de omslagfoto: voorbeeld, uploaden of kiezen, adres plakken en omschrijving. */
export function OmslagKaart({
  kop,
  url,
  alt,
  soort,
  adresUitleg,
  uitlegAls,
  onZet,
  children,
}: {
  kop: string;
  url: string;
  alt: string;
  soort: EditorUploadSoort;
  /** Uitleg onder het adresveld. */
  adresUitleg: string;
  uitlegAls?: "p" | "div";
  onZet: (w: Partial<Omslag>) => void;
  /** Komt direct onder de kop (bijv. een idee van de AI). */
  children?: ReactNode;
}) {
  return (
    <section className={kaart}>
      <h2 className="text-lg font-semibold">{kop}</h2>
      {children}
      {url && toonbareOmslag(url) && (
        // eslint-disable-next-line @next/next/no-img-element -- geüploade of externe foto
        <img src={url} alt={alt} className="aspect-[16/9] w-full rounded-xl object-cover" />
      )}
      <div className="flex flex-wrap items-start gap-2">
        <FotoUpload soort={soort} map="omslag" label={url ? "Andere foto uploaden" : "Foto uploaden"} onUrl={(u) => onZet({ omslag_url: u })} />
        <MediaKiezer accept="foto" map={soort} titel="Omslagfoto kiezen" onKies={(m) => onZet(omslagUitBibliotheek(alt, m))} />
        {url && (
          <button type="button" onClick={() => onZet({ omslag_url: "", omslag_alt: "" })} className={`${knopSecundair} text-red-700 dark:text-red-300`}>
            Foto weghalen
          </button>
        )}
      </div>
      <Veld label="Of plak een adres (https://…)" htmlFor="omslag-url" uitlegAls={uitlegAls} uitleg={adresUitleg}>
        <input id="omslag-url" type="url" inputMode="url" value={url} onChange={(e) => onZet({ omslag_url: e.target.value.trim() })} className={invoerBreed} placeholder="https://…" />
      </Veld>
      <Veld
        label="Omschrijving van de foto"
        htmlFor="omslag-alt"
        uitlegAls={uitlegAls}
        teller={<Teller waarde={alt} max={300} />}
        uitleg="Kort beschrijven wat er op de foto staat (voor slechtzienden en Google)."
      >
        <input id="omslag-alt" value={alt} maxLength={300} onChange={(e) => onZet({ omslag_alt: e.target.value })} className={invoerBreed} />
      </Veld>
    </section>
  );
}
