import Link from "next/link";
import { AdminNav } from "../../AdminNav";

/** Beheernavigatie plus een kruimelpad binnen de pagina's. */
export function PaginaKop({ pad }: { pad: { href?: string; label: string }[] }) {
  return (
    <>
      <AdminNav actief="/admin/paginas" />
      <nav aria-label="Kruimelpad" className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-black/55 dark:text-white/55">
        <Link href="/admin/paginas" className="hover:text-accent hover:underline">
          Pagina&apos;s
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
