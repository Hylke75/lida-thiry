import { ZICHTBAARHEID_LABEL } from "@/lib/blog/beheer";
import type { Zichtbaarheid } from "@/lib/blog/regels";

// Losse badges (zonder navigatie), zodat client-componenten ze kunnen gebruiken.

const KLEUR: Record<Zichtbaarheid, string> = {
  concept: "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70",
  ingepland: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  online: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
};

export function ZichtbaarheidBadge({ status }: { status: Zichtbaarheid }) {
  return (
    <span className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${KLEUR[status]}`}>
      {ZICHTBAARHEID_LABEL[status]}
    </span>
  );
}

export function AiBadge() {
  return (
    <span
      title="Geschreven met hulp van AI"
      className="inline-block shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900 dark:bg-violet-950/50 dark:text-violet-200"
    >
      AI
    </span>
  );
}
