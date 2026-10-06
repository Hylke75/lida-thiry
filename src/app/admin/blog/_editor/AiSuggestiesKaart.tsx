"use client";

import { normaliseerTags } from "@/lib/blog/regels";
import { Draaier } from "@/components/admin/editor/onderdelen";
import { kaart, knopKlein, knopSecundair, tekstZacht } from "@/components/admin/stijl";
import type { AiHulp } from "./useAiHulp";
import type { BlogEditorStaat } from "./useBlogEditor";

/** Kaart waarin de AI titels, een samenvatting, SEO-teksten en tags voorstelt. */
export function AiSuggestiesKaart({ ai, editor }: { ai: AiHulp; editor: Pick<BlogEditorStaat, "v" | "zet" | "zetTitel"> }) {
  const { aiBezig, suggesties } = ai;
  const { v, zet, zetTitel } = editor;
  return (
    <section className={kaart}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">✨ Titels &amp; SEO voorstellen</h2>
        <button type="button" onClick={() => void ai.aiSuggesties()} disabled={Boolean(aiBezig) || !v.inhoud.trim()} className={knopSecundair}>
          {aiBezig === "Titels & SEO bedenken" ? (
            <>
              <Draaier /> Bezig…
            </>
          ) : suggesties ? (
            "Nieuwe voorstellen"
          ) : (
            "Voorstellen laten maken"
          )}
        </button>
      </div>
      <p className={`text-xs ${tekstZacht}`}>De AI leest je tekst en stelt titels, een samenvatting, SEO-teksten en tags voor. Jij kiest wat je gebruikt.</p>
      {suggesties && (
        <div className="flex min-w-0 flex-col gap-4 text-sm">
          {suggesties.titels.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="font-medium">Titels</p>
              {suggesties.titels.map((t) => (
                <Suggestie key={t} tekst={t} gebruikt={v.titel === t} onGebruik={() => zetTitel(t)} />
              ))}
            </div>
          )}
          {suggesties.samenvatting && (
            <div className="flex flex-col gap-1.5">
              <p className="font-medium">Samenvatting</p>
              <Suggestie tekst={suggesties.samenvatting} gebruikt={v.samenvatting === suggesties.samenvatting} onGebruik={() => zet({ samenvatting: suggesties.samenvatting })} />
            </div>
          )}
          {suggesties.seo_titel && (
            <div className="flex flex-col gap-1.5">
              <p className="font-medium">SEO-titel</p>
              <Suggestie tekst={suggesties.seo_titel} gebruikt={v.seo_titel === suggesties.seo_titel} onGebruik={() => zet({ seo_titel: suggesties.seo_titel.slice(0, 70) })} />
            </div>
          )}
          {suggesties.seo_omschrijving && (
            <div className="flex flex-col gap-1.5">
              <p className="font-medium">SEO-omschrijving</p>
              <Suggestie
                tekst={suggesties.seo_omschrijving}
                gebruikt={v.seo_omschrijving === suggesties.seo_omschrijving}
                onGebruik={() => zet({ seo_omschrijving: suggesties.seo_omschrijving.slice(0, 170) })}
              />
            </div>
          )}
          {suggesties.tags.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="font-medium">Tags</p>
              <Suggestie
                tekst={suggesties.tags.join(", ")}
                gebruikt={suggesties.tags.every((t) => v.tags.includes(t))}
                label="Toevoegen"
                onGebruik={() => zet({ tags: normaliseerTags([...v.tags, ...suggesties.tags]) })}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Suggestie({ tekst, gebruikt, label = "Gebruiken", onGebruik }: { tekst: string; gebruikt: boolean; label?: string; onGebruik: () => void }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-2 rounded-lg bg-black/[0.03] px-3 py-2 dark:bg-white/5">
      <span className="min-w-0 break-words">{tekst}</span>
      <button type="button" onClick={onGebruik} disabled={gebruikt} className={`${knopKlein} shrink-0`}>
        {gebruikt ? "✓ Gebruikt" : label}
      </button>
    </div>
  );
}
