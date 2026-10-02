import "server-only";
import { adminClient } from "./supabase/admin";

export interface InhoudBeeld {
  beeld_id: string;
  code: string;
  pad: string;
  thumb_pad: string | null;
  bijschrift: string | null;
  naam: string | null;
}

export interface InhoudSectie {
  id: string;
  volgorde: number;
  kop: string;
  tekst: string;
  beelden: InhoudBeeld[];
}

export interface AdviesInhoud {
  sleutel: string;
  titel: string;
  categorie: number;
  letter: string;
  secties: InhoudSectie[];
}

/** Haalt een adviestype op met zijn secties en (geordende) beelden uit de beeldbank. */
export async function haalAdviesInhoud(sleutel: string): Promise<AdviesInhoud | null> {
  const supabase = adminClient();
  const { data: type } = await supabase
    .from("adviestypes")
    .select("sleutel, titel, categorie, letter")
    .eq("sleutel", sleutel)
    .maybeSingle();
  if (!type) return null;

  const { data: secties } = await supabase
    .from("adviessecties")
    .select(
      "id, volgorde, kop, tekst, sectie_beelden(volgorde, beelden(id, code, pad, thumb_pad, bijschrift, naam))",
    )
    .eq("type_sleutel", sleutel)
    .order("volgorde", { ascending: true });

  type Rij = {
    id: string;
    volgorde: number;
    kop: string;
    tekst: string;
    sectie_beelden: {
      volgorde: number;
      beelden: {
        id: string;
        code: string;
        pad: string;
        thumb_pad: string | null;
        bijschrift: string | null;
        naam: string | null;
      };
    }[];
  };

  return {
    ...type,
    secties: ((secties ?? []) as unknown as Rij[]).map((s) => ({
      id: s.id,
      volgorde: s.volgorde,
      kop: s.kop,
      tekst: s.tekst,
      beelden: [...s.sectie_beelden]
        .sort((a, b) => a.volgorde - b.volgorde)
        .map((sb) => ({
          beeld_id: sb.beelden.id,
          code: sb.beelden.code,
          pad: sb.beelden.pad,
          thumb_pad: sb.beelden.thumb_pad,
          bijschrift: sb.beelden.bijschrift,
          naam: sb.beelden.naam,
        })),
    })),
  };
}
