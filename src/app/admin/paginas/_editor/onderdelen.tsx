
export function StatusBadge({ status }: { status: "concept" | "gepubliceerd" }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        status === "gepubliceerd"
          ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200"
          : "bg-black/5 text-black/70 dark:bg-white/10 dark:text-white/70"
      }`}
    >
      {status === "gepubliceerd" ? "Online" : "Concept"}
    </span>
  );
}
