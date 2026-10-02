import { STATUS_LABELS, type BeeldStatus } from "@/lib/beeldbank-beheer";

const STATUS_KLASSE: Record<BeeldStatus, string> = {
  origineel: "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70",
  vervangen: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
  goedgekeurd: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
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
