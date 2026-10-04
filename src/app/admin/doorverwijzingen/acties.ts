"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { parseerCsvRijen } from "@/lib/nieuwsbrief/csv";
import { alleDoorverwijzingen } from "@/lib/doorverwijzingen/beheer";
import { legeDoorverwijzingCache } from "@/lib/doorverwijzingen/cache";
import {
  analyseerImport,
  controleerTegenBestaande,
  MAX_IMPORT_RIJEN,
  testAdres,
  valideerDoorverwijzing,
  vanInLus,
  type Doorverwijzing,
  type TestUitkomst,
} from "@/lib/doorverwijzingen/regels";

const PAD = "/admin/doorverwijzingen";
const MAX_IMPORT_TEKENS = 800_000;

function terug(tekst: string, soort: "ok" | "fout" = "ok"): never {
  redirect(`${PAD}?${soort}=${encodeURIComponent(tekst)}`);
}

function klaar() {
  legeDoorverwijzingCache();
  revalidatePath(PAD);
}

export type BewaarStaat = { fouten: string[] } | null;

/** Nieuwe doorverwijzing of een bestaande aanpassen (useActionState). */
export async function bewaarDoorverwijzing(_vorige: BewaarStaat, fd: FormData): Promise<BewaarStaat> {
  await vereisBeheerder("doorverwijzingen");
  const ruwId = String(fd.get("id") ?? "");
  const id = UUID_PATROON.test(ruwId) ? ruwId : null;
  const v = valideerDoorverwijzing({ van: fd.get("van"), naar: fd.get("naar"), permanent: fd.get("permanent") });
  if (!v.ok) return { fouten: v.fouten };

  let bestaande;
  try {
    bestaande = await alleDoorverwijzingen();
  } catch (e) {
    return { fouten: [e instanceof Error ? e.message : String(e)] };
  }
  const huidig = id ? bestaande.find((r) => r.id === id) : undefined;
  if (id && !huidig) return { fouten: ["Deze doorverwijzing bestaat niet (meer)."] };
  const dubbel = bestaande.find((r) => r.van === v.waarde.van && r.id !== id);
  if (dubbel) {
    return { fouten: [`Voor ${v.waarde.van} bestaat al een doorverwijzing (naar ${dubbel.naar}). Pas die aan in de lijst.`] };
  }
  const { fouten, waarschuwingen } = controleerTegenBestaande(v.waarde, bestaande, huidig?.van);
  if (fouten.length) return { fouten };

  const rij = { ...v.waarde, automatisch: false };
  const { error } = id
    ? await adminClient().from("doorverwijzingen").update(rij).eq("id", id)
    : await adminClient().from("doorverwijzingen").insert(rij);
  if (error) {
    return { fouten: [error.code === "23505" ? `Voor ${v.waarde.van} bestaat al een doorverwijzing.` : `Opslaan mislukt: ${error.message}`] };
  }
  await logActie({
    actie: id ? "doorverwijzing.wijzigen" : "doorverwijzing.toevoegen",
    onderwerpSoort: "doorverwijzing",
    onderwerpId: id ?? v.waarde.van,
    omschrijving: `${id ? "Doorverwijzing gewijzigd" : "Doorverwijzing toegevoegd"}: ${v.waarde.van} → ${v.waarde.naar}`,
    details: { ...v.waarde, was: huidig ? { van: huidig.van, naar: huidig.naar, permanent: huidig.permanent } : undefined },
  });
  klaar();
  terug([`${id ? "Opgeslagen" : "Toegevoegd"}: ${v.waarde.van} → ${v.waarde.naar}.`, ...waarschuwingen.map((w) => `Let op: ${w}`)].join(" "));
}

export async function verwijderDoorverwijzing(fd: FormData): Promise<void> {
  await vereisBeheerder("doorverwijzingen");
  const id = String(fd.get("id") ?? "");
  if (!UUID_PATROON.test(id)) terug("Onbekende doorverwijzing.", "fout");
  const { data, error } = await adminClient().from("doorverwijzingen").delete().eq("id", id).select("van");
  if (error) terug(`Verwijderen mislukt: ${error.message}`, "fout");
  if (data?.length) {
    await logActie({
      actie: "doorverwijzing.verwijderen",
      onderwerpSoort: "doorverwijzing",
      onderwerpId: id,
      omschrijving: `Doorverwijzing vanaf ${data[0].van} verwijderd`,
    });
  }
  klaar();
  terug(data?.length ? `Doorverwijzing vanaf ${data[0].van} verwijderd.` : "Deze doorverwijzing bestond niet (meer).");
}

/** Wat er gebeurt bij een bezoek aan dit adres (met de huidige tabel, niet de cache). */
export async function testDoorverwijzing(invoer: string): Promise<{ ok: true; uitkomst: TestUitkomst } | { ok: false; fout: string }> {
  await vereisBeheerder("doorverwijzingen");
  try {
    const regels = await alleDoorverwijzingen();
    return { ok: true, uitkomst: testAdres(regels, String(invoer ?? "").slice(0, 2000)) };
  } catch (e) {
    return { ok: false, fout: e instanceof Error ? e.message : String(e) };
  }
}

// CSV-import ---------------------------------------------------------------------------

export interface ImportVoorbeeld {
  nieuw: number;
  bijgewerkt: number;
  ongewijzigd: number;
  ongeldig: { regel: number; reden: string }[];
  dubbel: number;
  voorbeeld: Doorverwijzing[];
}

type ImportUitkomst = { ok: true; voorbeeld: ImportVoorbeeld } | { ok: false; fout: string };

/** Analyseert de CSV-tekst tegen de huidige tabel: wat wordt nieuw, wat verandert, wat is ongeldig. */
async function analyseer(tekst: string): Promise<{ ok: false; fout: string } | { ok: true; voorbeeld: ImportVoorbeeld; teSchrijven: Doorverwijzing[] }> {
  if (tekst.length > MAX_IMPORT_TEKENS) return { ok: false, fout: "Het bestand is te groot (maximaal 800 kB)." };
  const rijen = parseerCsvRijen(tekst);
  if (rijen.length > MAX_IMPORT_RIJEN + 1) return { ok: false, fout: `Maximaal ${MAX_IMPORT_RIJEN} doorverwijzingen per keer. Splits het bestand.` };
  const a = analyseerImport(rijen);
  const bestaande = await alleDoorverwijzingen();
  const perVan = new Map(bestaande.map((r) => [r.van, r]));

  // Lussen controleren op de tabel zoals die na de import zou zijn.
  const naImport = new Map<string, Doorverwijzing>(bestaande.map((r) => [r.van, r]));
  for (const r of a.rijen) naImport.set(r.van, r);
  const lus = vanInLus([...naImport.values()]);

  const ongeldig = [...a.ongeldig];
  const teSchrijven: Doorverwijzing[] = [];
  let nieuw = 0;
  let bijgewerkt = 0;
  let ongewijzigd = 0;
  for (const r of a.rijen) {
    if (lus.has(r.van)) {
      ongeldig.push({ regel: r.regel, reden: `${r.van} → ${r.naar} maakt een rondje met andere doorverwijzingen.` });
      continue;
    }
    const oud = perVan.get(r.van);
    if (!oud) nieuw++;
    else if (oud.naar === r.naar && oud.permanent === r.permanent) {
      ongewijzigd++;
      continue;
    } else bijgewerkt++;
    teSchrijven.push({ van: r.van, naar: r.naar, permanent: r.permanent });
  }
  ongeldig.sort((x, y) => x.regel - y.regel);
  return {
    ok: true,
    teSchrijven,
    voorbeeld: { nieuw, bijgewerkt, ongewijzigd, ongeldig, dubbel: a.dubbel, voorbeeld: teSchrijven.slice(0, 10) },
  };
}

export async function controleerImport(tekst: string): Promise<ImportUitkomst> {
  await vereisBeheerder("doorverwijzingen");
  try {
    const a = await analyseer(String(tekst ?? ""));
    return a.ok ? { ok: true, voorbeeld: a.voorbeeld } : a;
  } catch (e) {
    return { ok: false, fout: e instanceof Error ? e.message : String(e) };
  }
}

export async function voerImportUit(tekst: string): Promise<ImportUitkomst> {
  await vereisBeheerder("doorverwijzingen");
  try {
    const a = await analyseer(String(tekst ?? ""));
    if (!a.ok) return a;
    if (a.teSchrijven.length) {
      const { error } = await adminClient()
        .from("doorverwijzingen")
        .upsert(
          a.teSchrijven.map((r) => ({ ...r, automatisch: false })),
          { onConflict: "van" },
        );
      if (error) return { ok: false, fout: `Importeren mislukt: ${error.message}` };
    }
    await logActie({
      actie: "doorverwijzing.importeren",
      onderwerpSoort: "doorverwijzing",
      omschrijving: `Doorverwijzingen geïmporteerd: ${a.voorbeeld.nieuw} nieuw, ${a.voorbeeld.bijgewerkt} bijgewerkt`,
      details: { nieuw: a.voorbeeld.nieuw, bijgewerkt: a.voorbeeld.bijgewerkt, ongewijzigd: a.voorbeeld.ongewijzigd, ongeldig: a.voorbeeld.ongeldig.length },
    });
    klaar();
    return { ok: true, voorbeeld: a.voorbeeld };
  } catch (e) {
    return { ok: false, fout: e instanceof Error ? e.message : String(e) };
  }
}
