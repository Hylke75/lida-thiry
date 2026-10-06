"use client";

import { slugify } from "@/lib/slug";
import { Teller, Veld, Vinkje } from "@/components/admin/editor/onderdelen";
import { invoerBreed, kaart, knopSecundair } from "@/components/admin/stijl";
import { TagInvoer } from "./TagInvoer";
import type { BlogEditorStaat } from "./useBlogEditor";
import { slugTijdensTypen } from "./velden";

/** Kaart "Gegevens": webadres (met doorverwijzingswaarschuwing), samenvatting, categorie, auteur, tags en uitgelicht. */
export function GegevensKaart({
  editor,
  categorieen,
  bekendeTags,
}: {
  editor: Pick<BlogEditorStaat, "v" | "zet" | "url" | "zichtbaar" | "opgeslagen" | "slugAuto" | "setSlugAuto">;
  categorieen: string[];
  bekendeTags: string[];
}) {
  const { v, zet, url, zichtbaar, opgeslagen, slugAuto, setSlugAuto } = editor;
  return (
    <section className={kaart}>
      <h2 className="text-lg font-semibold">Gegevens</h2>
      <Veld
        label="Webadres"
        htmlFor="slug"
        uitleg={
          <>
            <span className="break-all">{url}</span>
            {zichtbaar === "online" && v.slug !== opgeslagen.slug && (
              <span className="mt-1 block font-medium text-amber-700 dark:text-amber-300">
                Let op: dit bericht staat al online. Bij opslaan stuurt het oude adres bezoekers automatisch door naar het nieuwe (zie Doorverwijzingen); werk links op andere plekken liefst ook bij.
              </span>
            )}
          </>
        }
      >
        <div className="flex gap-2">
          <input
            id="slug"
            value={v.slug}
            maxLength={100}
            onChange={(e) => {
              setSlugAuto(false);
              zet({ slug: slugTijdensTypen(e.target.value) });
            }}
            onBlur={() => {
              const schoon = slugify(v.slug);
              if (schoon && schoon !== v.slug) zet({ slug: schoon });
            }}
            className={invoerBreed}
          />
          {!slugAuto && slugify(v.titel) && slugify(v.titel) !== v.slug && (
            <button type="button" onClick={() => zet({ slug: slugify(v.titel) })} className={`${knopSecundair} shrink-0`} title="Webadres opnieuw maken uit de titel">
              Uit titel
            </button>
          )}
        </div>
      </Veld>
      <Veld label="Samenvatting" htmlFor="samenvatting" teller={<Teller waarde={v.samenvatting} max={500} />} uitleg="Een of twee zinnen voor het blogoverzicht (en als voorvertoning in de nieuwsbrief).">
        <textarea id="samenvatting" value={v.samenvatting} maxLength={500} rows={3} onChange={(e) => zet({ samenvatting: e.target.value })} className={invoerBreed} />
      </Veld>
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <Veld label="Categorie" htmlFor="categorie" uitleg="Kies een bestaande of typ een nieuwe.">
          <input id="categorie" value={v.categorie} maxLength={60} list="blog-categorieen" onChange={(e) => zet({ categorie: e.target.value })} className={invoerBreed} placeholder="Bijv. Stijladvies" />
          <datalist id="blog-categorieen">
            {categorieen.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Veld>
        <Veld label="Auteur" htmlFor="auteur">
          <input id="auteur" value={v.auteur} maxLength={80} onChange={(e) => zet({ auteur: e.target.value })} className={invoerBreed} />
        </Veld>
      </div>
      <Veld label="Tags" htmlFor="tags">
        <TagInvoer id="tags" waarde={v.tags} suggesties={bekendeTags} onChange={(tags) => zet({ tags })} />
      </Veld>
      <Vinkje checked={v.uitgelicht} onChange={(b) => zet({ uitgelicht: b })} titel="Uitgelicht" uitleg="Uitgelichte berichten krijgen een prominente plek op de site." />
    </section>
  );
}
