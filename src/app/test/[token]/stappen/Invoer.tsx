import { schoonGetal } from "../wizard-regels";

/** Getalveld met eenheid (cm, kg) en optionele foutmelding. */
export function Invoer({
  label,
  eenheid,
  voorbeeld,
  waarde,
  zet,
  fout,
}: {
  label: string;
  eenheid: string;
  voorbeeld?: string;
  waarde: string;
  zet: (w: string) => void;
  fout?: string | null;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-black/70 dark:text-white/70">{label}</span>
      <span
        className={`flex items-center rounded-lg border focus-within:border-black/50 dark:focus-within:border-white/60 ${
          fout ? "border-red-400" : "border-black/15 dark:border-white/20"
        }`}
      >
        <input
          inputMode="decimal"
          placeholder={voorbeeld}
          value={waarde}
          onChange={(e) => zet(schoonGetal(e.target.value))}
          className="w-full min-w-0 bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
        />
        <span className="pr-3 text-black/40 dark:text-white/40">{eenheid}</span>
      </span>
      {fout && <span className="text-xs text-red-600 dark:text-red-400">{fout}</span>}
    </label>
  );
}
