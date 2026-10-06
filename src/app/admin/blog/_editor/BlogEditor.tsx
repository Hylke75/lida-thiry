"use client";

import { useRef, type ReactNode } from "react";
import type { Opmaakknop } from "@/lib/blog/beheer";
import { leestijdMinuten, metaOmschrijving, woorden, type BlogBericht, type Zichtbaarheid } from "@/lib/blog/regels";
import { toonDatumTijd } from "@/lib/datum";
import { SeoKaart } from "@/components/admin/editor/GoogleVoorbeeld";
import { OmslagKaart } from "@/components/admin/editor/OmslagKaart";
import { OpslaanBalk } from "@/components/admin/editor/OpslaanBalk";
import { Meldingen } from "@/components/admin/editor/onderdelen";
import { FotoInvoegen, OpmaakWerkbalk, SchrijfTabs } from "@/components/admin/editor/Schrijven";
import { invoerBreed, knopSecundair, tekstZacht } from "@/components/admin/stijl";
import { Geschiedenis } from "../../versies/Geschiedenis";
import { AiUit, AiVoorstelPaneel, AiWerkbalk } from "./AiHulp";
import { AiSuggestiesKaart } from "./AiSuggestiesKaart";
import { ArtikelTekst } from "./Artikel";
import { AiBadge, ZichtbaarheidBadge } from "./badges";
import { GegevensKaart } from "./GegevensKaart";
import { NieuwsbriefKaart, PublicerenKaart } from "./PublicerenKaart";
import { useAiHulp } from "./useAiHulp";
import { useBlogEditor } from "./useBlogEditor";

const WERKBALK: { knop: Opmaakknop; label: ReactNode; titel: string }[] = [
  { knop: "kop", label: "Kop", titel: "Tussenkop (## aan het begin van de regel)" },
  { knop: "subkop", label: "Subkop", titel: "Kleinere kop (###)" },
  { knop: "vet", label: <strong>Vet</strong>, titel: "Vetgedrukt (**tekst**)" },
  { knop: "lijst", label: "• Lijst", titel: "Opsomming (- aan het begin van de regel)" },
  { knop: "link", label: "Link", titel: "Link: [tekst](https://…)" },
];

export function BlogEditor({
  bericht,
  beginZichtbaar,
  categorieen,
  bekendeTags,
  aiAan,
  site,
  standaardMoment,
}: {
  bericht: BlogBericht;
  beginZichtbaar: Zichtbaarheid;
  categorieen: string[];
  bekendeTags: string[];
  aiAan: boolean;
  site: string;
  standaardMoment: string;
}) {
  const tekstvak = useRef<HTMLTextAreaElement>(null);
  const aiPaneel = useRef<HTMLDivElement>(null);
  const editor = useBlogEditor({ bericht, beginZichtbaar, site, standaardMoment, tekstvak });
  const ai = useAiHulp(editor, aiPaneel);
  const { id, opgeslagen, zichtbaar, v, gewijzigd, bezig, melding, zet, zetTitel, tekst } = editor;
  const aantalWoorden = woorden(v.inhoud);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Vaste balk met status en opslaan. */}
      <OpslaanBalk
        status={
          <>
            <ZichtbaarheidBadge status={zichtbaar} />
            {opgeslagen.ai_gegenereerd && <AiBadge />}
            {zichtbaar === "ingepland" && <span className={tekstZacht}>verschijnt {toonDatumTijd(opgeslagen.gepubliceerd_op)}</span>}
          </>
        }
        gewijzigd={gewijzigd}
        bezig={bezig}
        geschiedenis={<Geschiedenis soort="blog" refId={id} onTerugzetten={editor.versieTerugzetten} gewijzigd={gewijzigd} knopKlasse={knopSecundair} />}
        bekijkHref={zichtbaar === "online" && !gewijzigd ? `/blog/${opgeslagen.slug}` : null}
        voorbeeldHref={`/admin/blog/${id}/voorbeeld`}
        onOpslaan={editor.opslaan}
      />

      {melding && <Meldingen soort={melding.soort} tekst={melding.tekst} />}

      {/* Titel */}
      <div className="flex min-w-0 flex-col gap-1">
        <label htmlFor="titel" className="text-sm font-medium">
          Titel
        </label>
        <input
          id="titel"
          value={v.titel}
          maxLength={200}
          onChange={(e) => zetTitel(e.target.value)}
          className={`${invoerBreed} font-serif text-xl sm:text-2xl`}
          placeholder="Bijv. Zo kies je de perfecte jurk voor jouw figuur"
        />
      </div>

      {/* Tekst + voorbeeld */}
      <section className="flex min-w-0 flex-col gap-3">
        <SchrijfTabs tab={tekst.tab} onTab={tekst.setTab} />

        <AiVoorstelPaneel ai={ai} paneel={aiPaneel} />

        <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
          <div className={`${tekst.schrijfKolom} min-w-0 flex-col gap-2`}>
            <OpmaakWerkbalk knoppen={WERKBALK} onOpmaak={tekst.werkbalk} onFoto={tekst.openFoto} />

            {tekst.foto && (
              <FotoInvoegen
                alt={tekst.foto.alt}
                onAlt={(alt) => tekst.setFoto({ alt })}
                soort="blog"
                placeholder="Bijv. Vrouw in een donkerblauwe wikkeljurk"
                onIngevoegd={tekst.fotoIngevoegd}
                onAnnuleer={() => tekst.setFoto(null)}
              />
            )}

            {aiAan ? <AiWerkbalk ai={ai} /> : null}

            <textarea
              ref={tekstvak}
              id="inhoud"
              aria-label="Tekst van het bericht"
              value={v.inhoud}
              onChange={(e) => zet({ inhoud: e.target.value })}
              rows={24}
              spellCheck
              lang="nl"
              className={`${invoerBreed} min-h-[50vh] resize-y font-mono text-[13px] leading-relaxed lg:min-h-[70vh]`}
              placeholder={"Schrijf hier je bericht.\n\n## Tussenkop\n\nEen alinea met **vette tekst** en een [link](/bestellen).\n\n- een opsomming\n- nog een punt"}
            />
            <p className={`text-xs ${tekstZacht}`}>
              {aantalWoorden} {aantalWoorden === 1 ? "woord" : "woorden"} · ongeveer {leestijdMinuten(v.inhoud)} min lezen. Opmaak: <code>## kop</code>,{" "}
              <code>### subkop</code>, <code>- lijst</code>, <code>**vet**</code>, <code>[tekst](https://…)</code>, een lege regel voor een nieuwe alinea.
            </p>
          </div>

          <div className={`${tekst.voorbeeldKolom} min-w-0 flex-col gap-2 lg:sticky lg:top-20`}>
            <p className={`hidden text-xs lg:block ${tekstZacht}`}>Voorbeeld (werkt direct bij)</p>
            <div className="max-h-none min-w-0 overflow-y-auto rounded-2xl border border-black/10 bg-background p-4 sm:p-6 lg:max-h-[75vh] dark:border-white/15">
              <h1 className="mb-4 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{v.titel || "(nog geen titel)"}</h1>
              {v.inhoud.trim() ? <ArtikelTekst inhoud={v.inhoud} /> : <p className={`text-sm ${tekstZacht}`}>Nog geen tekst.</p>}
            </div>
          </div>
        </div>

        {!aiAan && <AiUit />}
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <GegevensKaart editor={editor} categorieen={categorieen} bekendeTags={bekendeTags} />

          <OmslagKaart
            kop="Omslagfoto"
            url={v.omslag_url}
            alt={v.omslag_alt}
            soort="blog"
            adresUitleg="JPG, PNG, GIF of WebP, maximaal 5 MB bij uploaden. Liefst liggend (16:9)."
            onZet={zet}
          >
            {editor.omslagSuggestie && !v.omslag_url && (
              <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
                ✨ Idee van de AI voor de omslagfoto: {editor.omslagSuggestie}
              </p>
            )}
          </OmslagKaart>

          <SeoKaart
            titel={v.titel}
            seoTitel={v.seo_titel}
            seoOmschrijving={v.seo_omschrijving}
            onSeoTitel={(seo_titel) => zet({ seo_titel })}
            onSeoOmschrijving={(seo_omschrijving) => zet({ seo_omschrijving })}
            url={editor.url}
            omschrijving={metaOmschrijving(v)}
            leegUitleg="Laat je deze velden leeg, dan gebruikt de site de titel en de samenvatting."
            voorbeeldUitleg="Zo ongeveer zie je het bericht in Google:"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <PublicerenKaart editor={editor} />
          {aiAan && <AiSuggestiesKaart ai={ai} editor={editor} />}
          <NieuwsbriefKaart editor={editor} />
        </div>
      </div>
    </div>
  );
}
