import type { ReactNode } from "react";
import type { Kenmerken } from "@/lib/relaties/zoeken";

export { invoer, hoofdknop, kleineKnop, datum } from "../nieuwsbrief/contacten/stijl";

export const PAD = "/admin/adresboek";

export const gevaarKnop = "border-red-300 text-red-700 dark:border-red-800 dark:text-red-300";
export const kaart = "flex flex-col gap-3 rounded-xl border border-black/10 bg-kaart p-5 dark:border-white/15";
export const zacht = "text-black/60 dark:text-white/60";
export const heelZacht = "text-black/50 dark:text-white/50";

export const BERICHT_STATUS_LABEL: Record<string, string> = {
  nieuw: "Nieuw",
  gelezen: "Gelezen",
  beantwoord: "Beantwoord",
  gearchiveerd: "Gearchiveerd",
  spam: "Spam",
};

const BADGE = {
  klant: { label: "Klant", kleur: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300" },
  nieuwsbrief: { label: "Nieuwsbrief", kleur: "bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300" },
  bericht: { label: "Bericht", kleur: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
} as const;

export function Badges({ k }: { k: Kenmerken }) {
  const actief = (Object.keys(BADGE) as (keyof typeof BADGE)[]).filter((s) => k[s]);
  if (!actief.length) return null;
  return (
    <span className="flex flex-wrap gap-1">
      {actief.map((s) => (
        <span key={s} className={`rounded-full px-2 py-0.5 text-xs ${BADGE[s].kleur}`}>
          {BADGE[s].label}
        </span>
      ))}
    </span>
  );
}

export function Veld({ label, children, breed }: { label: string; children: ReactNode; breed?: boolean }) {
  return (
    <label className={`flex min-w-0 flex-col gap-1 text-sm ${breed ? "sm:col-span-2" : ""}`}>
      <span className="text-black/70 dark:text-white/70">{label}</span>
      {children}
    </label>
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
