import { badge, toon, type Toon } from "@/components/admin/stijl";
import { STATUS_LABEL, type ContactStatus } from "@/lib/nieuwsbrief/doelgroep";

const KLEUR: Record<ContactStatus, Toon> = {
  aangemeld: "groen",
  onbevestigd: "amber",
  afgemeld: "grijs",
  gebounced: "rood",
  klacht: "rood",
};

export function StatusLabel({ status }: { status: ContactStatus }) {
  return <span className={`${badge} ${toon[KLEUR[status]]}`}>{STATUS_LABEL[status]}</span>;
}
