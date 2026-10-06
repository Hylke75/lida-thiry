import { badge, toon } from "@/components/admin/stijl";

export function StatusBadge({ status }: { status: "concept" | "gepubliceerd" }) {
  return (
    <span
      className={`${badge} ${status === "gepubliceerd" ? toon.groen : toon.grijs}`}
    >
      {status === "gepubliceerd" ? "Online" : "Concept"}
    </span>
  );
}
