import Link from "next/link";
import { AdminNav } from "../../AdminNav";

export const STATUS_LABEL: Record<string, string> = {
  concept: "Concept",
  ingepland: "Ingepland",
  bezig: "Wordt verzonden",
  verzonden: "Verzonden",
  gepauzeerd: "Gepauzeerd",
};

const STATUS_KLEUR: Record<string, string> = {
  concept: "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70",
  ingepland: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  bezig: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  verzonden: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  gepauzeerd: "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-200",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_KLEUR[status] ?? STATUS_KLEUR.concept}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function ActiefBadge({ actief }: { actief: boolean }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        actief ? STATUS_KLEUR.verzonden : STATUS_KLEUR.concept
      }`}
    >
      {actief ? "Aan" : "Uit"}
    </span>
  );
}

/** Beheernavigatie plus een kruimelpad binnen de nieuwsbrief. */
export function NieuwsbriefKop({ pad }: { pad: { href?: string; label: string }[] }) {
  return (
    <>
      <AdminNav />
      <nav aria-label="Kruimelpad" className="flex flex-wrap items-center gap-1 text-sm text-black/55 dark:text-white/55">
        <Link href="/admin/nieuwsbrief" className="hover:text-accent hover:underline">
          Nieuwsbrief
        </Link>
        {pad.map((p) => (
          <span key={p.label} className="flex min-w-0 items-center gap-1">
            <span aria-hidden>›</span>
            {p.href ? (
              <Link href={p.href} className="truncate hover:text-accent hover:underline">
                {p.label}
              </Link>
            ) : (
              <span className="truncate">{p.label}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
