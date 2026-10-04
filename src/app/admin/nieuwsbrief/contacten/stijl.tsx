import { STATUS_LABEL, type ContactStatus } from "@/lib/nieuwsbrief/doelgroep";

export const invoer =
  "min-w-0 rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20";
export const hoofdknop =
  "rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50";
export const kleineKnop =
  "rounded-full border border-black/15 px-3 py-1 text-xs hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/5";

const KLEUR: Record<ContactStatus, string> = {
  aangemeld: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  onbevestigd: "bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  afgemeld: "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60",
  gebounced: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
  klacht: "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300",
};

export function StatusLabel({ status }: { status: ContactStatus }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${KLEUR[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  });
}
