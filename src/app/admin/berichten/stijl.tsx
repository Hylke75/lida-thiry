import { BERICHT_STATUS_LABEL, type BerichtStatus } from "@/lib/contact/regels";

export const invoer =
  "min-w-0 rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20";
export const hoofdknop =
  "rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50";
export const kleineKnop =
  "rounded-full border border-black/15 px-3 py-1 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/5";
export const gevaarKnop = `${kleineKnop} border-red-300 text-red-700 dark:border-red-800 dark:text-red-300`;

const KLEUR: Record<BerichtStatus, string> = {
  nieuw: "bg-accent-zacht text-accent",
  gelezen: "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60",
  beantwoord: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  gearchiveerd: "bg-black/5 text-black/50 dark:bg-white/10 dark:text-white/50",
  spam: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
};

export function BerichtStatusLabel({ status }: { status: BerichtStatus }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${KLEUR[status]}`}>{BERICHT_STATUS_LABEL[status]}</span>;
}

/** "4 okt 2026, 14:03" (Nederlandse tijd). */
export function datumTijd(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}
