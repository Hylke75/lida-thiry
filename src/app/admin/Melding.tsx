import type { ReactNode } from "react";
import { toon } from "@/components/admin/stijl";

/** Groene of rode melding bovenaan een pagina. */
export function Melding({ soort, children }: { soort: "ok" | "fout"; children: ReactNode }) {
  return (
    <p
      role={soort === "fout" ? "alert" : "status"}
      className={`rounded-lg px-4 py-3 text-sm ${soort === "ok" ? toon.groen : toon.rood}`}
    >
      {children}
    </p>
  );
}
