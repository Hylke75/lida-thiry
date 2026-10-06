import Link from "next/link";
import { AdminNav } from "../../AdminNav";

/** Beheernavigatie plus kruimelpad voor de formulierpagina's. */
export function FormulierenKop({ pad }: { pad: { href?: string; label: string }[] }) {
  return (
    <>
      {/* Valt onder "Nieuwsbrief"; licht "Formulieren" op zodra die link in de navigatie staat. */}
      <AdminNav actief="/admin/nieuwsbrief/formulieren" />
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
