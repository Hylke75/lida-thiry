import Link from "next/link";
import { ZICHTBAARHEID_LABEL } from "@/lib/blog/beheer";
import type { Zichtbaarheid } from "@/lib/blog/regels";
import { AdminNav, type AdminPagina } from "../../AdminNav";

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

/** Beheernavigatie plus een kruimelpad binnen de blog. */
export function BlogKop({ pad, actief }: { pad: { href?: string; label: string }[]; actief: AdminPagina }) {
  return (
    <>
      <AdminNav actief={actief} />
      <nav aria-label="Kruimelpad" className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-black/55 dark:text-white/55">
        <Link href="/admin/blog" className="hover:text-accent hover:underline">
          Blog
        </Link>
        {pad.map((p) => (
          <span key={p.label} className="flex min-w-0 items-center gap-1">
            <span aria-hidden>›</span>
            {p.href ? (
              <Link href={p.href} className="truncate hover:text-accent hover:underline">
                {p.label}
              </Link>
            ) : (
              <span className="max-w-[16rem] truncate">{p.label}</span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
