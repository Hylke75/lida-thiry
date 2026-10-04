import type { AdminPad } from "../AdminNav";
import { Melding } from "../Melding";
import { STATUS_LABEL, type AfspraakStatus } from "@/lib/afspraken/regels";

// Gedeelde opmaak voor de afsprakenpagina's in het beheer.

/**
 * Actieve link in de beheernavigatie. De menu-items voor Afspraken staan (nog)
 * niet in AdminNav; tot die er zijn, valt dit pad terug op geen actieve link.
 */
export const NAV_AFSPRAKEN = "/admin/afspraken" as AdminPad;
export const NAV_AFSPRAKEN_INSTELLINGEN = "/admin/afspraken/instellingen" as AdminPad;

export const invoer =
  "rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20";
export const knop =
  "rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90";
export const knopLicht =
  "rounded-full border border-black/15 px-4 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5";
export const kaart = "flex flex-col gap-3 rounded-xl border border-black/10 bg-kaart p-5 dark:border-white/15";
export const zacht = "text-black/60 dark:text-white/60";

const KLEUR: Record<AfspraakStatus, string> = {
  wacht_op_betaling: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200",
  aangevraagd: "bg-sky-100 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200",
  bevestigd: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  geannuleerd: "bg-black/5 text-black/50 line-through dark:bg-white/10 dark:text-white/50",
  afgerond: "bg-accent-zacht text-accent",
  niet_verschenen: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200",
};

export function StatusLabel({ status }: { status: AfspraakStatus }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${KLEUR[status]}`}>{STATUS_LABEL[status]}</span>;
}

/** Groene/rode melding uit ?ok= of ?fout=. */
export function Meldingen({ ok, fout }: { ok?: string; fout?: string }) {
  return (
    <>
      {ok && <Melding soort="ok">{ok}</Melding>}
      {fout && <Melding soort="fout">{fout}</Melding>}
    </>
  );
}
