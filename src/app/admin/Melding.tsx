import type { ReactNode } from "react";

/** Groene of rode melding bovenaan een pagina. */
export function Melding({ soort, children }: { soort: "ok" | "fout"; children: ReactNode }) {
  return (
    <p
      role={soort === "fout" ? "alert" : "status"}
      className={`rounded-lg px-4 py-3 text-sm ${
        soort === "ok"
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {children}
    </p>
  );
}
