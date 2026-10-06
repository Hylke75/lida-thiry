import type { ReactNode } from "react";
import { BlokRuimte, PaginaWeergave } from "@/components/paginas/PaginaWeergave";
import { blokLabel, gebruikteBlokken, type FormulierKeuze } from "@/lib/paginas/beheer";

/** In het beheer: elk blok als gemarkeerd vak met een label, niet het echte formulier. */
function voorbeeldBlokken(inhoud: string, formulieren: readonly FormulierKeuze[]): Record<string, ReactNode> {
  const uit: Record<string, ReactNode> = {};
  for (const naam of gebruikteBlokken(inhoud)) {
    const { label, bekend } = blokLabel(naam, formulieren);
    uit[naam] = (
      <BlokRuimte>
        <div
          className={`flex min-h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-6 text-center text-sm ${
            bekend
              ? "border-accent/40 bg-accent-zacht/60 text-accent"
              : "border-red-400 bg-red-50 text-red-800 dark:border-red-500/60 dark:bg-red-950/30 dark:text-red-200"
          }`}
        >
          <span className="font-medium">{bekend ? "Blok" : "Let op"}</span>
          <span className="break-words">{label}</span>
          <code className="text-xs opacity-70">{`{${naam}}`}</code>
        </div>
      </BlokRuimte>
    );
  }
  return uit;
}

/** De pagina zoals bezoekers hem zien, met blokken als gemarkeerde vakken. */
export function PaginaVoorbeeld({
  titel,
  intro,
  inhoud,
  omslagUrl,
  omslagAlt,
  formulieren,
  kop,
}: {
  titel: string;
  intro: string;
  inhoud: string;
  omslagUrl: string | null;
  omslagAlt: string;
  formulieren: readonly FormulierKeuze[];
  kop?: "h1" | "h2";
}): ReactNode {
  return (
    <PaginaWeergave
      titel={titel}
      intro={intro}
      inhoud={inhoud}
      omslagUrl={omslagUrl}
      omslagAlt={omslagAlt}
      blokken={voorbeeldBlokken(inhoud, formulieren)}
      kop={kop}
    />
  );
}
