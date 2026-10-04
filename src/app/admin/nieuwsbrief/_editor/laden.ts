import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstellingen } from "@/lib/instellingen";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { valideerBlokken } from "@/lib/nieuwsbrief/blokken";
import { normaliseerDoelgroep } from "@/lib/nieuwsbrief/doelgroep";
import { abUitCampagne } from "@/lib/nieuwsbrief/ab-test";
import type { Campagne } from "@/lib/nieuwsbrief/verzenden";
import type { MailInhoud, TypeKeuze } from "./regels";

export interface EditorContext {
  afzender: { naam: string; adres: string | null };
  maxPerDag: number;
  tags: string[];
  typen: TypeKeuze[];
}

/** Alle bestaande tags van contacten, op alfabet. */
async function bestaandeTags(): Promise<string[]> {
  const supabase = adminClient();
  const tags = new Set<string>();
  for (let van = 0; van < 20_000; van += 1000) {
    const { data, error } = await supabase
      .from("nb_contacten")
      .select("tags")
      .neq("tags", "{}")
      .order("id")
      .range(van, van + 999);
    if (error) break;
    for (const r of (data ?? []) as { tags: string[] }[]) for (const t of r.tags ?? []) tags.add(t);
    if (!data || data.length < 1000) break;
  }
  return [...tags].sort((a, b) => a.localeCompare(b, "nl")).slice(0, 200);
}

/** Wat de editor nodig heeft naast de mail zelf. */
export async function laadEditorContext(metDoelgroep: boolean): Promise<EditorContext> {
  const [inst, tags, types] = await Promise.all([
    leesInstellingen(),
    metDoelgroep ? bestaandeTags() : Promise.resolve([]),
    metDoelgroep ? haalLichaamstypes().catch(() => []) : Promise.resolve([]),
  ]);
  const max = Number(inst.nb_max_per_dag);
  return {
    // Gelijk aan de afzender die verzenden.ts in de echte mail zet.
    afzender: {
      naam: inst.bedrijfsnaam?.trim() || "Lida Thiry Imago & Kledingadvies",
      adres: inst.bedrijf_adres?.trim() || null,
    },
    maxPerDag: Number.isFinite(max) && max > 0 ? Math.floor(max) : 100,
    tags,
    typen: types.filter((t) => t.actief).map((t) => ({ letter: t.code, naam: t.naam })),
  };
}

export function alsInhoud(c: Campagne): MailInhoud {
  return {
    naam: c.naam,
    onderwerp: c.onderwerp,
    preheader: c.preheader,
    blokken: valideerBlokken(c.blokken).blokken,
    doelgroep: normaliseerDoelgroep(c.doelgroep),
    trigger: c.trigger,
    vertraging_dagen: c.vertraging_dagen,
    ab: c.soort === "campagne" ? abUitCampagne(c) : null,
  };
}
