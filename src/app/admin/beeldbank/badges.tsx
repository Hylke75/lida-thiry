import { STATUS_LABELS, type BeeldStatus } from "@/lib/beeldbank-beheer";
import { toon } from "@/components/admin/stijl";

const STATUS_KLASSE: Record<BeeldStatus, string> = {
  origineel: toon.grijs,
  vervangen: toon.blauw,
  goedgekeurd: toon.groen,
};

export function StatusBadge({ status }: { status: string }) {
  const s = (status in STATUS_LABELS ? status : "origineel") as BeeldStatus;
  return (
    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_KLASSE[s]}`}>
      {STATUS_LABELS[s]}
    </span>
  );
}

export function TeKleinBadge() {
  return (
    <span className="whitespace-nowrap rounded-full bg-red-600 px-2 py-0.5 text-[11px] font-semibold text-white">
      te klein
    </span>
  );
}
