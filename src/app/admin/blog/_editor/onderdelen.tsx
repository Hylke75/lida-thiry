import Link from "next/link";
import { AdminNav, type AdminPagina } from "../../AdminNav";

export { AiBadge, ZichtbaarheidBadge } from "./badges";

/** Beheernavigatie plus een kruimelpad binnen de blog. */
export function BlogKop({ pad, actief }: { pad: { href?: string; label: string }[]; actief: AdminPagina }) {
  return (
    <>
      <AdminNav actief={actief} />
      <nav aria-label="Kruimelpad" className="flex min-w-0 flex-wrap items-center gap-1 text-sm text-foreground/70">
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
