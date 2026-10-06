"use client";

import { useRef, type ReactNode } from "react";
import type { Opmaakknop } from "@/lib/blog/beheer";
import { INTRO_MAX, paginaOmschrijving, voegBlokIn, type FormulierKeuze, type Pagina } from "@/lib/paginas/beheer";
import { SeoKaart } from "@/components/admin/editor/GoogleVoorbeeld";
import { OmslagKaart } from "@/components/admin/editor/OmslagKaart";
import { OpslaanBalk } from "@/components/admin/editor/OpslaanBalk";
import { Meldingen, Teller, Veld, Vinkje } from "@/components/admin/editor/onderdelen";
import { FotoInvoegen, OpmaakWerkbalk, SchrijfTabs } from "@/components/admin/editor/Schrijven";
import { invoerBreed, knopSecundair, tekstZacht } from "@/components/admin/stijl";
import { Geschiedenis } from "../../versies/Geschiedenis";
import { BlokMenu } from "./BlokMenu";
import { PublicerenKaart, WebadresKaart } from "./Kaarten";
import { StatusBadge } from "./onderdelen";
import { usePaginaEditor } from "./usePaginaEditor";
import { PaginaVoorbeeld } from "./voorbeeld";

const WERKBALK: { knop: Opmaakknop; label: ReactNode; titel: string }[] = [
  { knop: "kop", label: "Kop", titel: "Tussenkop (## aan het begin van de regel)" },
  { knop: "subkop", label: "Subkop", titel: "Kleinere kop (###)" },
  { knop: "vet", label: <strong>Vet</strong>, titel: "Vetgedrukt (**tekst**)" },
  { knop: "lijst", label: "• Lijst", titel: "Opsomming (- aan het begin van de regel)" },
  { knop: "link", label: "Link", titel: "Link: [tekst](https://…) of [tekst](/contact)" },
];

export function PaginaEditor({ pagina, formulieren, site }: { pagina: Pagina; formulieren: FormulierKeuze[]; site: string }) {
  const tekstvak = useRef<HTMLTextAreaElement>(null);
  const editor = usePaginaEditor({ pagina, formulieren, site, tekstvak });
  const { id, opgeslagen, online, v, gewijzigd, bezig, melding, onbekend, zet, zetTitel, tekst } = editor;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Vaste balk met status en opslaan. */}
      <OpslaanBalk
        status={<StatusBadge status={opgeslagen.status} />}
        gewijzigd={gewijzigd}
        bezig={bezig}
        geschiedenis={<Geschiedenis soort="pagina" refId={id} onTerugzetten={editor.versieTerugzetten} gewijzigd={gewijzigd} knopKlasse={knopSecundair} />}
        bekijkHref={online && !gewijzigd ? `/${opgeslagen.slug}` : null}
        voorbeeldHref={`/admin/paginas/${id}/voorbeeld`}
        onOpslaan={editor.opslaan}
      />

      {melding && <Meldingen soort={melding.soort} tekst={melding.tekst} />}

      {/* Titel en intro */}
      <div className="flex min-w-0 flex-col gap-4">
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
            placeholder="Bijv. Over mij"
          />
        </div>
        <Veld label="Intro" htmlFor="intro" uitlegAls="div" teller={<Teller waarde={v.intro} max={INTRO_MAX} />} uitleg="Een of twee zinnen onder de titel (zonder opmaak).">
          <textarea id="intro" value={v.intro} maxLength={INTRO_MAX} rows={2} onChange={(e) => zet({ intro: e.target.value })} className={invoerBreed} />
        </Veld>
      </div>

      {/* Tekst + voorbeeld */}
      <section className="flex min-w-0 flex-col gap-3">
        <SchrijfTabs tab={tekst.tab} onTab={tekst.setTab} />

        <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
          <div className={`${tekst.schrijfKolom} min-w-0 flex-col gap-2`}>
            <OpmaakWerkbalk knoppen={WERKBALK} onOpmaak={tekst.werkbalk} onFoto={tekst.openFoto}>
              <BlokMenu formulieren={formulieren} onKies={(naam) => tekst.voegIn((t, start, eind) => voegBlokIn(t, start, eind, naam))} />
            </OpmaakWerkbalk>

            {tekst.foto && (
              <FotoInvoegen
                alt={tekst.foto.alt}
                onAlt={(alt) => tekst.setFoto({ alt })}
                soort="paginas"
                placeholder="Bijv. Lida bij een rek met kleding"
                uitlegAls="div"
                onIngevoegd={tekst.fotoIngevoegd}
                onAnnuleer={() => tekst.setFoto(null)}
              />
            )}

            <textarea
              ref={tekstvak}
              id="inhoud"
              aria-label="Tekst van de pagina"
              value={v.inhoud}
              onChange={(e) => zet({ inhoud: e.target.value })}
              rows={22}
              spellCheck
              lang="nl"
              className={`${invoerBreed} min-h-[45vh] resize-y font-mono text-[13px] leading-relaxed lg:min-h-[65vh]`}
              placeholder={"Schrijf hier de tekst van de pagina.\n\n## Tussenkop\n\nEen alinea met **vette tekst** en een [link](/blog).\n\n{contactformulier}"}
            />
            {onbekend.length > 0 && (
              <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                Onbekend blok: {onbekend.map((b) => `{${b}}`).join(", ")}. Dit wordt op de site niet getoond. Controleer de spelling, of kies het blok via
                &quot;Blok invoegen&quot; (een nieuwsbriefformulier moet bestaan en actief zijn).
              </p>
            )}
            <p className={`text-xs ${tekstZacht}`}>
              Opmaak: <code>## kop</code>, <code>### subkop</code>, <code>- lijst</code>, <code>**vet**</code>, <code>[tekst](https://…)</code>, een lege regel voor een
              nieuwe alinea. Een blok zoals <code>{"{contactformulier}"}</code> staat op een eigen regel.
            </p>
          </div>

          <div className={`${tekst.voorbeeldKolom} min-w-0 flex-col gap-2 lg:sticky lg:top-20`}>
            <p className={`hidden text-xs lg:block ${tekstZacht}`}>Voorbeeld (werkt direct bij; blokken zie je als gemarkeerde vakken)</p>
            <div className="max-h-none min-w-0 overflow-y-auto rounded-2xl border border-black/10 bg-background p-4 sm:p-6 lg:max-h-[75vh] dark:border-white/15">
              <PaginaVoorbeeld
                titel={v.titel}
                intro={v.intro}
                inhoud={v.inhoud}
                omslagUrl={v.omslag_url || null}
                omslagAlt={v.omslag_alt}
                formulieren={formulieren}
                kop="h2"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <WebadresKaart editor={editor} />

          <OmslagKaart
            kop="Omslagfoto (optioneel)"
            url={v.omslag_url}
            alt={v.omslag_alt}
            soort="paginas"
            adresUitleg="JPG, PNG, GIF of WebP, maximaal 5 MB bij uploaden. Liefst liggend (16:9). Wordt ook gebruikt als deelafbeelding."
            uitlegAls="div"
            onZet={zet}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <PublicerenKaart editor={editor} />

          <SeoKaart
            titel={v.titel}
            seoTitel={v.seo_titel}
            seoOmschrijving={v.seo_omschrijving}
            onSeoTitel={(seo_titel) => zet({ seo_titel })}
            onSeoOmschrijving={(seo_omschrijving) => zet({ seo_omschrijving })}
            url={editor.url}
            omschrijving={paginaOmschrijving(v)}
            leegUitleg="Laat je deze velden leeg, dan gebruikt de site de titel en de intro."
            voorbeeldUitleg="Zo ongeveer zie je de pagina in Google:"
          >
            <Vinkje
              checked={v.niet_indexeren}
              onChange={(b) => zet({ niet_indexeren: b })}
              titel="Niet tonen in Google"
              uitleg="De pagina blijft bereikbaar via een link, maar zoekmachines nemen hem niet op (en hij staat niet in de sitemap)."
            />
          </SeoKaart>
        </div>
      </div>
    </div>
  );
}
