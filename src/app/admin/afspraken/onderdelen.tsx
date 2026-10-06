import type { AdminPad } from "../AdminNav";
import { Melding } from "../Melding";
import { badge, toon } from "@/components/admin/stijl";
import { STATUS_LABEL, type AfspraakStatus } from "@/lib/afspraken/regels";

// Gedeelde onderdelen voor de afsprakenpagina's in het beheer.

/**
 * Actieve link in de beheernavigatie. De menu-items voor Afspraken staan (nog)
 * niet in AdminNav; tot die er zijn, valt dit pad terug op geen actieve link.
 */
export const NAV_AFSPRAKEN = "/admin/afspraken" as AdminPad;
export const NAV_AFSPRAKEN_INSTELLINGEN = "/admin/afspraken/instellingen" as AdminPad;

const KLEUR: Record<AfspraakStatus, string> = {
  wacht_op_betaling: toon.amber,
  aangevraagd: toon.blauw,
  bevestigd: toon.groen,
  geannuleerd: `${toon.grijs} line-through`,
  afgerond: toon.accent,
  niet_verschenen: toon.rood,
};

export function StatusLabel({ status }: { status: AfspraakStatus }) {
  return <span className={`${badge} ${KLEUR[status]}`}>{STATUS_LABEL[status]}</span>;
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
