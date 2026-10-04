import { Fragment, type ReactNode } from "react";
import { parseerOpmaak, type Inline } from "@/lib/inhoud/opmaak";

function InlineDelen({
  delen,
  variabelen,
}: {
  delen: Inline[];
  variabelen?: Readonly<Record<string, ReactNode>>;
}) {
  return (
    <>
      {delen.map((d, i) => {
        switch (d.soort) {
          case "tekst":
            return <Fragment key={i}>{d.tekst}</Fragment>;
          case "regel":
            return <br key={i} />;
          case "vet":
            return (
              <strong key={i}>
                <InlineDelen delen={d.kinderen} variabelen={variabelen} />
              </strong>
            );
          case "link": {
            const extern = /^https?:\/\//i.test(d.url);
            return (
              <a key={i} href={d.url} {...(extern ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                <InlineDelen delen={d.kinderen} variabelen={variabelen} />
              </a>
            );
          }
          case "variabele":
            return (
              <Fragment key={i}>
                {variabelen && d.naam in variabelen ? variabelen[d.naam] : `{${d.naam}}`}
              </Fragment>
            );
        }
      })}
    </>
  );
}

/**
 * Toont een beheerbare tekst met eenvoudige opmaak (zie src/lib/inhoud/opmaak.ts).
 * De elementen krijgen geen eigen klassen: style ze via de omliggende container.
 */
export function Opmaak({
  tekst,
  variabelen,
  blokken,
}: {
  tekst: string;
  variabelen?: Readonly<Record<string, ReactNode>>;
  /** Inhoud voor {blok}-regels, bijv. { bedrijfsgegevens: <Identiteit /> }. */
  blokken?: Readonly<Record<string, ReactNode>>;
}) {
  return (
    <>
      {parseerOpmaak(tekst).map((b, i) => {
        switch (b.soort) {
          case "kop":
            return b.niveau === 2 ? (
              <h2 key={i}>
                <InlineDelen delen={b.inhoud} variabelen={variabelen} />
              </h2>
            ) : (
              <h3 key={i}>
                <InlineDelen delen={b.inhoud} variabelen={variabelen} />
              </h3>
            );
          case "alinea":
            return (
              <p key={i}>
                <InlineDelen delen={b.inhoud} variabelen={variabelen} />
              </p>
            );
          case "lijst":
            return (
              <ul key={i}>
                {b.items.map((item, j) => (
                  <li key={j}>
                    <InlineDelen delen={item} variabelen={variabelen} />
                  </li>
                ))}
              </ul>
            );
          case "blok":
            return <Fragment key={i}>{blokken?.[b.naam] ?? null}</Fragment>;
          case "afbeelding":
            // eslint-disable-next-line @next/next/no-img-element -- externe of geüploade afbeelding met vrije afmetingen
            return <img key={i} src={b.url} alt={b.alt} loading="lazy" />;
        }
      })}
    </>
  );
}
