import { badge, toon } from "@/components/admin/stijl";
import type { Kenmerken } from "@/lib/relaties/zoeken";

export const PAD = "/admin/adresboek";

export const BERICHT_STATUS_LABEL: Record<string, string> = {
  nieuw: "Nieuw",
  gelezen: "Gelezen",
  beantwoord: "Beantwoord",
  gearchiveerd: "Gearchiveerd",
  spam: "Spam",
};

const BADGE = {
  klant: { label: "Klant", kleur: toon.groen },
  nieuwsbrief: { label: "Nieuwsbrief", kleur: toon.blauw },
  bericht: { label: "Bericht", kleur: toon.amber },
} as const;

export function Badges({ k }: { k: Kenmerken }) {
  const actief = (Object.keys(BADGE) as (keyof typeof BADGE)[]).filter((s) => k[s]);
  if (!actief.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {actief.map((s) => (
        <span key={s} className={`${badge} ${BADGE[s].kleur}`}>
          {BADGE[s].label}
        </span>
      ))}
    </span>
  );
}

/** Tekst die `terug` als ok/fout-melding toont, met een veilige terugweg binnen het adresboek. */
export function terugUrl(naar: string, melding: string, soort: "ok" | "fout" = "ok"): string {
  const basis = naar.startsWith(PAD) && !naar.includes("//") ? naar : PAD;
  const url = new URL(basis, "http://x");
  url.searchParams.delete("ok");
  url.searchParams.delete("fout");
  url.searchParams.set(soort, melding);
  return `${url.pathname}${url.search}`;
}
