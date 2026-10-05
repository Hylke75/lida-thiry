import { Opmaak } from "@/components/Opmaak";
import { splitsVoorVoorbeeld } from "@/lib/blog/beheer";
import { leestijdMinuten } from "@/lib/blog/regels";

/** Opmaak van de artikeltekst, zoals op de openbare blogpagina. */
const ARTIKEL_TEKST =
  "flex min-w-0 flex-col gap-4 break-words leading-relaxed text-foreground/80 [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mt-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-foreground [&_img]:my-2 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-xl [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6";

/** De tekst, met opvallende vakken op de plekken waar nog een foto moet komen (alleen in het beheer). */
export function ArtikelTekst({ inhoud }: { inhoud: string }) {
  return (
    <div className={ARTIKEL_TEKST}>
      {splitsVoorVoorbeeld(inhoud).map((d, i) =>
        d.soort === "tekst" ? (
          <Opmaak key={i} tekst={d.tekst} />
        ) : (
          <div
            key={i}
            className="flex min-h-28 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-amber-400 bg-amber-50 px-4 py-6 text-center text-sm text-amber-900 dark:border-amber-500/60 dark:bg-amber-950/30 dark:text-amber-200"
          >
            <span className="font-medium">📷 Foto nog toevoegen</span>
            {d.beschrijving && <span className="text-xs">{d.beschrijving}</span>}
          </div>
        ),
      )}
    </div>
  );
}

const datum = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "long", year: "numeric" })
    : null;

/** Het hele artikel zoals bezoekers het straks zien (voor het voorbeeld in het beheer). */
export function Artikel({
  titel,
  samenvatting,
  inhoud,
  omslagUrl,
  omslagAlt,
  auteur,
  categorie,
  tags,
  gepubliceerdOp,
}: {
  titel: string;
  samenvatting: string;
  inhoud: string;
  omslagUrl: string | null;
  omslagAlt: string;
  auteur: string;
  categorie: string | null;
  tags: string[];
  gepubliceerdOp: string | null;
}) {
  const omslag = omslagUrl && /^https:\/\//.test(omslagUrl) ? omslagUrl : null;
  return (
    <article className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-3">
        {categorie && <p className="text-xs font-medium uppercase tracking-widest text-accent">{categorie}</p>}
        <h1 className="break-words text-3xl font-semibold tracking-tight sm:text-4xl">{titel || "(nog geen titel)"}</h1>
        {samenvatting && <p className="text-lg leading-relaxed text-foreground/70">{samenvatting}</p>}
        <p className="text-sm text-foreground/50">
          {[auteur, datum(gepubliceerdOp) ?? "nog niet gepubliceerd", `${leestijdMinuten(inhoud)} min lezen`].filter(Boolean).join(" · ")}
        </p>
      </header>
      {omslag && (
        // eslint-disable-next-line @next/next/no-img-element -- geüploade of externe foto met vrije afmetingen
        <img src={omslag} alt={omslagAlt} className="aspect-[16/9] w-full rounded-2xl object-cover" />
      )}
      <ArtikelTekst inhoud={inhoud} />
      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-2 border-t border-foreground/10 pt-4">
          {tags.map((t) => (
            <li key={t} className="rounded-full bg-accent-zacht px-3 py-1 text-xs text-accent">
              #{t}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
