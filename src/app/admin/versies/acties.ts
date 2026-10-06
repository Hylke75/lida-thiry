"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { vindSectie } from "@/lib/inhoud/register";
import { herstelVerwijderd, haalVersie, huidigeSnapshot, lijstVersies, wisGeschiedenis, zetTerug } from "@/lib/versies/beheer";
import { regelDiff, type DiffRegel } from "@/lib/versies/diff";
import { blogAlsTekst, isVersieSoort, paginaAlsTekst, tekstAlsTekst, type VersieMeta, type VersieSoort } from "@/lib/versies/regels";
import { metWaarschuwing } from "@/lib/doorverwijzingen/beheer";
import { zichtbaarheid, type BlogBericht, type Zichtbaarheid } from "@/lib/blog/regels";
import type { Pagina } from "@/lib/paginas/beheer";

type Fout = { ok: false; fouten: string[] };
const fout = (...fouten: string[]): Fout => ({ ok: false, fouten });

const PRULLENBAK_PAD = "/admin/versies/prullenbak";

function alsTekst(soort: VersieSoort, ref: string, inhoud: unknown): string {
  if (soort === "pagina") return paginaAlsTekst(inhoud);
  if (soort === "blog") return blogAlsTekst(inhoud);
  const gevonden = vindSectie(ref);
  return gevonden ? tekstAlsTekst(gevonden.sectie, inhoud) : JSON.stringify(inhoud, null, 2);
}

/** De versies van een pagina, bericht of tekstonderdeel (nieuwste eerst). */
export async function haalVersies(soort: string, ref: string): Promise<{ ok: true; versies: VersieMeta[] } | Fout> {
  await vereisBeheerder("prullenbak");
  if (!isVersieSoort(soort) || !ref) return fout("Onbekend onderdeel.");
  try {
    return { ok: true, versies: await lijstVersies(soort, ref) };
  } catch (e) {
    console.error(e);
    return fout("De geschiedenis kon niet worden geladen.");
  }
}

/** Vergelijkt wat er nu is opgeslagen met een versie ("weg" = verdwijnt bij terugzetten, "erbij" = komt terug). */
export async function vergelijkVersie(id: string): Promise<{ ok: true; regels: DiffRegel[] } | Fout> {
  await vereisBeheerder("prullenbak");
  try {
    const versie = await haalVersie(id);
    if (!versie) return fout("Deze versie bestaat niet (meer).");
    const nu = await huidigeSnapshot(versie.soort, versie.ref);
    const oud = alsTekst(versie.soort, versie.ref, versie.inhoud);
    const huidig = nu === null ? "" : alsTekst(versie.soort, versie.ref, nu);
    return { ok: true, regels: regelDiff(huidig, oud) };
  } catch (e) {
    console.error(e);
    return fout("De vergelijking kon niet worden gemaakt.");
  }
}

// Terugzetten vanuit de editors (elk met het resultaat dat die editor verwacht) ----------

export async function zetPaginaVersieTerug(id: string): Promise<{ ok: true; pagina: Pagina; melding: string } | Fout> {
  const user = await vereisBeheerder("prullenbak");
  const r = await zetTerug(id, user.email);
  if (!r.ok) return r;
  if (r.soort !== "pagina") return fout("Deze versie hoort niet bij een pagina.");
  await logActie({
    actie: "pagina.versie_terugzetten",
    onderwerpSoort: "pagina",
    onderwerpId: r.pagina.id,
    omschrijving: `Eerdere versie van pagina ‘${r.pagina.titel}’ teruggezet`,
    details: { versie: id },
    gebruiker: user,
  });
  return {
    ok: true,
    pagina: r.pagina,
    melding: metWaarschuwing("De versie is teruggezet. De vorige inhoud staat in de geschiedenis.", r.waarschuwing),
  };
}

export async function zetBerichtVersieTerug(
  id: string,
): Promise<{ ok: true; bericht: BlogBericht; zichtbaar: Zichtbaarheid; melding: string } | Fout> {
  const user = await vereisBeheerder("prullenbak");
  const r = await zetTerug(id, user.email);
  if (!r.ok) return r;
  if (r.soort !== "blog") return fout("Deze versie hoort niet bij een blogbericht.");
  await logActie({
    actie: "blog.versie_terugzetten",
    onderwerpSoort: "blog",
    onderwerpId: r.bericht.id,
    omschrijving: `Eerdere versie van blogbericht ‘${r.bericht.titel}’ teruggezet`,
    details: { versie: id },
    gebruiker: user,
  });
  return {
    ok: true,
    bericht: r.bericht,
    zichtbaar: zichtbaarheid(r.bericht),
    melding: metWaarschuwing("De versie is teruggezet. De vorige inhoud staat in de geschiedenis.", r.waarschuwing),
  };
}

export async function zetTekstVersieTerug(
  id: string,
): Promise<{ ok: true; bericht: string; waarden: Record<string, unknown>; aangepast: boolean } | Fout> {
  const user = await vereisBeheerder("prullenbak");
  const r = await zetTerug(id, user.email);
  if (!r.ok) return r;
  if (r.soort !== "tekst") return fout("Deze versie hoort niet bij een tekst.");
  await logActie({
    actie: "tekst.versie_terugzetten",
    onderwerpSoort: "tekst",
    onderwerpId: r.sleutel,
    omschrijving: "Eerdere versie van een tekst teruggezet",
    details: { versie: id },
    gebruiker: user,
  });
  return {
    ok: true,
    bericht: "De versie is teruggezet en direct zichtbaar op de site. De vorige tekst staat in de geschiedenis.",
    waarden: r.waarden,
    aangepast: r.aangepast,
  };
}

// Prullenbak ------------------------------------------------------------------------------

export async function herstelUitPrullenbak(formData: FormData) {
  const ik = await vereisBeheerder("prullenbak");
  const id = String(formData.get("versie") ?? "");
  if (!UUID_PATROON.test(id)) redirect(`${PRULLENBAK_PAD}?fout=onbekend`);
  const r = await herstelVerwijderd(id);
  if (!r.ok) redirect(`${PRULLENBAK_PAD}?fout=herstellen`);
  await logActie({
    actie: `${r.soort}.herstellen`,
    onderwerpSoort: r.soort,
    onderwerpId: r.id,
    omschrijving: `${r.soort === "pagina" ? "Pagina" : "Blogbericht"} hersteld uit de prullenbak`,
    gebruiker: ik,
  });
  revalidatePath(PRULLENBAK_PAD);
  redirect(r.soort === "pagina" ? `/admin/paginas/${r.id}?hersteld=1` : `/admin/blog/${r.id}?hersteld=1`);
}

export async function wisUitPrullenbak(formData: FormData) {
  const ik = await vereisBeheerder("prullenbak");
  const soort = String(formData.get("soort") ?? "");
  const ref = String(formData.get("ref") ?? "");
  if (soort !== "pagina" && soort !== "blog") redirect(`${PRULLENBAK_PAD}?fout=onbekend`);
  const r = await wisGeschiedenis(soort, ref);
  if (!r.ok) redirect(`${PRULLENBAK_PAD}?fout=wissen`);
  await logActie({
    actie: "versie.definitief_wissen",
    onderwerpSoort: soort,
    onderwerpId: ref,
    omschrijving: `${soort === "pagina" ? "Pagina" : "Blogbericht"} definitief gewist uit de prullenbak`,
    gebruiker: ik,
  });
  revalidatePath(PRULLENBAK_PAD);
  redirect(`${PRULLENBAK_PAD}?gewist=1`);
}
