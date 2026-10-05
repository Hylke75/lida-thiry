import Link from "next/link";
import { statusLabel } from "@/lib/admin/status";

export interface OrderRijGegevens {
  id: string;
  klantnaam: string;
  email: string;
  status: string;
  toegekend_type: string | null;
  aangemaakt_op: string;
}

export const ORDER_RIJ_KOLOMMEN = "id, klantnaam, email, status, toegekend_type, aangemaakt_op";

/** Eén bestelling in een lijst, met link naar de detailpagina. */
export function OrderRij({ o }: { o: OrderRijGegevens }) {
  return (
    <Link
      href={`/admin/order/${o.id}`}
      className="flex items-center justify-between gap-4 rounded-lg border border-black/10 bg-kaart px-4 py-3 text-sm hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
    >
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{o.klantnaam}</span>
        <span className="truncate text-black/50 dark:text-white/50">{o.email}</span>
        <span className="text-xs text-black/40 dark:text-white/40">
          {new Date(o.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {o.toegekend_type && <span className="font-mono text-xs">{o.toegekend_type}</span>}
        <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs dark:bg-white/10">{statusLabel(o.status)}</span>
      </span>
    </Link>
  );
}
