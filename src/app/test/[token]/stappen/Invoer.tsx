import { schoonGetal } from "../wizard-regels";
import { LABEL, VELDFOUT } from "@/components/site/FormulierStijl";

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
    <label className="flex flex-col gap-2">
      <span className={LABEL}>{label}</span>
      <span
        className={`flex min-h-[52px] items-center rounded-ontwerp-sm border bg-white transition-[border-color,box-shadow] duration-150 ${
          fout
            ? "border-[#b42318] focus-within:shadow-[0_0_0_3px_rgba(180,35,24,.16)]"
            : "border-[rgba(47,36,65,.24)] focus-within:border-berry focus-within:shadow-[0_0_0_3px_rgba(111,45,89,.14)]"
        }`}
      >
        <input
          inputMode="decimal"
          placeholder={voorbeeld}
          value={waarde}
          onChange={(e) => zet(schoonGetal(e.target.value))}
          className="w-full min-w-0 bg-transparent px-4 py-3 text-[16px] text-ink outline-none placeholder:text-ink-soft focus-visible:outline-none"
        />
        <span className="pr-4 text-[15px] font-bold text-ink-soft">{eenheid}</span>
      </span>
      {fout && <span className={VELDFOUT}>{fout}</span>}
    </label>
  );
}
