import { ZICHTBAARHEID_LABEL } from "@/lib/blog/beheer";
import type { Zichtbaarheid } from "@/lib/blog/regels";
import { badge, toon } from "@/components/admin/stijl";

// Losse badges (zonder navigatie), zodat client-componenten ze kunnen gebruiken.

const KLEUR: Record<Zichtbaarheid, string> = {
  concept: toon.grijs,
  ingepland: toon.blauw,
  online: toon.groen,
};

export function ZichtbaarheidBadge({ status }: { status: Zichtbaarheid }) {
  return (
    <span className={`${badge} ${KLEUR[status]}`}>
      {ZICHTBAARHEID_LABEL[status]}
    </span>
  );
}

export function AiBadge() {
  return (
    <span
      title="Geschreven met hulp van AI"
      className={`${badge} bg-violet-50 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300`}
    >
      AI
    </span>
  );
}
