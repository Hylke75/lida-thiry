import { badge, toon, type Toon } from "@/components/admin/stijl";
import { BERICHT_STATUS_LABEL, type BerichtStatus } from "@/lib/contact/regels";

const KLEUR: Record<BerichtStatus, Toon> = {
  nieuw: "accent",
  gelezen: "grijs",
  beantwoord: "groen",
  gearchiveerd: "grijs",
  spam: "rood",
};

export function BerichtStatusLabel({ status }: { status: BerichtStatus }) {
  return <span className={`${badge} ${toon[KLEUR[status]]}`}>{BERICHT_STATUS_LABEL[status]}</span>;
}
