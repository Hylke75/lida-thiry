import Link from "next/link";
import { AdminNav, type AdminPagina } from "../../AdminNav";
import { badge, toon } from "@/components/admin/stijl";

const STATUS_LABEL: Record<string, string> = {
  concept: "Concept",
  ingepland: "Ingepland",
  bezig: "Wordt verzonden",
  verzonden: "Verzonden",
  gepauzeerd: "Gepauzeerd",
};

const STATUS_KLEUR: Record<string, string> = {
  concept: toon.grijs,
  ingepland: toon.blauw,
  bezig: toon.amber,
  verzonden: toon.groen,
  gepauzeerd: toon.rood,
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`${badge} ${STATUS_KLEUR[status] ?? STATUS_KLEUR.concept}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function ActiefBadge({ actief }: { actief: boolean }) {
  return (
    <span
      className={`${badge} ${actief ? STATUS_KLEUR.verzonden : STATUS_KLEUR.concept}`}
    >
      {actief ? "Aan" : "Uit"}
    </span>
  );
}

/** Beheernavigatie plus een kruimelpad binnen de nieuwsbrief. */
export function NieuwsbriefKop({ pad, actief }: { pad: { href?: string; label: string }[]; actief: AdminPagina }) {
  return (
    <>
      <AdminNav actief={actief} />
      <nav aria-label="Kruimelpad" className="flex flex-wrap items-center gap-1 text-sm text-foreground/70">
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
