"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { logActie } from "@/lib/beheer-log";
import { leesInstelling } from "@/lib/instellingen";
import { haalFfitToewijzing, haalLichaamstypes, haalRekenmodel, haalVerfijning } from "@/lib/lichaamstypes";
import {
  LIDA_GRENZEN_SLEUTEL,
  REKENMODEL_SLEUTEL,
  alsBovenlichaam,
  alsBreedstePunt,
} from "@/lib/rekenmodel";
import { LIDA_GRENZEN_BEREIK, type LidaGrenzen } from "@/rekenkern/config/lida-model";
import { bepaalCategorie } from "@/rekenkern/categorie";
import { bepaalFiguurtype } from "@/rekenkern/figuurtype";
import { bepaalLetter } from "@/rekenkern/letter";
import { bepaalSilhouetLida, type LidaKengetallen } from "@/rekenkern/lida-model";
import { STANDAARD_ZANDLOPER_VARIANT, type ZandloperVariant } from "@/rekenkern/config/ffit-regels";

export interface Status {
  ok: boolean;
  melding: string;
  tijd: number;
}

const ok = (melding: string): Status => ({ ok: true, melding, tijd: Date.now() });
const fout = (melding: string): Status => ({ ok: false, melding, tijd: Date.now() });
const tekst = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/** Een percentage uit het formulier ("8" of "8,5") als fractie, of null. */
function procent(fd: FormData, k: string): number | null {
  const w = tekst(fd, k).replace(",", ".");
  if (!w) return null;
  const n = Number(w);
  return Number.isFinite(n) ? n / 100 : null;
}

/** De rekenmethode (FFIT of die van Lida) en de grenzen van Lida's methode opslaan. */
export async function slaRekenmodelOp(_vorige: Status | null, fd: FormData): Promise<Status> {
  const ik = await vereisBeheerder("advies");
  const model = tekst(fd, "rekenmodel") === "lida" ? "lida" : "ffit";

  const grenzen = {} as LidaGrenzen;
  for (const k of Object.keys(LIDA_GRENZEN_BEREIK) as (keyof LidaGrenzen)[]) {
    const v = procent(fd, k);
    const { min, max } = LIDA_GRENZEN_BEREIK[k];
    if (v === null || v < min || v > max) {
      return fout(`Vul bij alle grenzen een getal in; deze grens moet tussen ${Math.round(min * 100)} en ${Math.round(max * 100)}% liggen.`);
    }
    grenzen[k] = Math.round(v * 1000) / 1000;
  }
  if (grenzen.peerHogeHeupMax > grenzen.lepelHogeHeupMin) {
    return fout("De grens voor de Peer (hoge heup) mag niet hoger zijn dan die voor de Lepel.");
  }

  const nu = new Date().toISOString();
  const { error } = await adminClient()
    .from("instellingen")
    .upsert([
      {
        sleutel: REKENMODEL_SLEUTEL,
        waarde: model,
        omschrijving: "Rekenmethode van de test: ffit (standaard) of lida.",
        bijgewerkt_op: nu,
      },
      {
        sleutel: LIDA_GRENZEN_SLEUTEL,
        waarde: JSON.stringify(grenzen),
        omschrijving: "Grenzen van Lida's rekenmethode (JSON); leeg = standaard.",
        bijgewerkt_op: nu,
      },
    ]);
  if (error) return fout(`Opslaan mislukte: ${error.message}`);
  await logActie({
    actie: "instellingen.wijzigen",
    onderwerpSoort: "instellingen",
    onderwerpId: REKENMODEL_SLEUTEL,
    omschrijving: `Rekenmethode van de test: ${model === "lida" ? "Lida" : "FFIT"}`,
    details: { model, grenzen },
    gebruiker: ik,
  });
  revalidatePath("/admin/rekentool");
  revalidatePath("/admin");
  return ok(
    model === "lida"
      ? "Opgeslagen. Nieuwe tests gebruiken nu jouw rekenmethode en vragen naar schouderbreedte, breedste punt en bovenlichaam."
      : "Opgeslagen. Nieuwe tests gebruiken de FFIT-methode; jouw grenzen zijn bewaard voor de proefberekening.",
  );
}

export interface ProefUitkomst {
  ok: true;
  categorie: { nummer: number; titel: string };
  ffit: { type: string; letter: string | null; naam: string | null };
  lida: { letter: string | null; naam: string | null; uitleg: string; kengetallen: LidaKengetallen };
  tijd: number;
}

/**
 * Proefberekening voor het beheer: rekent de ingevulde maten door met beide
 * methodes, met de opgeslagen grenzen en koppeling. Slaat niets op.
 */
export async function proefBereken(
  _vorige: ProefUitkomst | Status | null,
  fd: FormData,
): Promise<ProefUitkomst | Status> {
  await vereisBeheerder("advies");
  const getal = (k: string) => {
    const n = Number(tekst(fd, k).replace(",", "."));
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const lengte = getal("lengte");
  const gewicht = getal("gewicht");
  const borst = getal("borst");
  const taille = getal("taille");
  const hogeHeup = getal("hoge_heup");
  const heup = getal("heup");
  if ([lengte, gewicht, borst, taille, hogeHeup, heup].some((v) => v === null)) {
    return fout("Vul lengte, gewicht, borst, taille, hoge heup en heup in.");
  }
  const maten = { borst: borst!, taille: taille!, hogeHeup: hogeHeup!, heup: heup! };

  const [toewijzing, types, rekenmodel, verfijning, variantWaarde] = await Promise.all([
    haalFfitToewijzing(),
    haalLichaamstypes(),
    haalRekenmodel(),
    haalVerfijning(),
    leesInstelling("zandloper_variant"),
  ]);
  const naam = (code: string | null) => (code ? (types.find((t) => t.code === code)?.naam ?? code) : null);
  const variant = (variantWaarde || STANDAARD_ZANDLOPER_VARIANT) as ZandloperVariant;

  const categorie = bepaalCategorie(lengte!, gewicht!).categorie;
  const ffitType = bepaalFiguurtype(maten, variant);
  const ffitLetter = bepaalLetter(ffitType, toewijzing);
  const lida = bepaalSilhouetLida(
    { maten, breedstePunt: alsBreedstePunt(tekst(fd, "breedste_punt")), bovenlichaam: alsBovenlichaam(tekst(fd, "bovenlichaam")) },
    rekenmodel.grenzen,
    verfijning.aan ? verfijning.beschikbaar : [],
  );
  return {
    ok: true,
    categorie: { nummer: categorie.nummer, titel: categorie.titel },
    ffit: { type: ffitType, letter: ffitLetter, naam: naam(ffitLetter) },
    lida: { letter: lida.letter, naam: naam(lida.letter), uitleg: lida.uitleg, kengetallen: lida.kengetallen },
    tijd: Date.now(),
  };
}
