import { toon } from "@/components/admin/stijl";

/** Kleur van het bronlabel in de foutlog. */
export const BRON_KLEUR: Record<string, string> = {
  server: toon.rood,
  browser: toon.amber,
  cron: "bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  melding: toon.blauw,
  test: toon.grijs,
};
