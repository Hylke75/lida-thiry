import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { heeftRecht } from "@/lib/rollen";
import { AdminNav } from "../AdminNav";
import { adminClient } from "@/lib/supabase/admin";
import { datumInNederland, eindeVanDagNl } from "@/lib/cadeaubon/regels";
import { cadeauboncode, formatteerBedrag, normaliseerCode, type KortingSoort } from "@/lib/prijs";
import { datum } from "@/lib/datum";
import { invoer, kaart, knop, knopGevaarKlein, knopKlein, tekstUitleg } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";
import { ActieFormulier } from "../types/ActieFormulier";
import type { Uitkomst } from "../types/uitkomst";
import { controleerCodeWijziging } from "@/lib/verkoop/regels";

export const dynamic = "force-dynamic";

const PAD = "/admin/kortingscodes";

interface CodeRij {
  id: string;
  code: string;
  omschrijving: string | null;
  soort: KortingSoort;
  waarde: number;
  geldig_tot: string | null;
  max_gebruik: number | null;
  aantal_gebruikt: number;
  actief: boolean;
  aangemaakt_op: string;
}

function terug(melding: string, soort: "ok" | "fout" = "ok"): never {
  redirect(`${PAD}?${soort}=${encodeURIComponent(melding)}`);
}

/** Datumveld (yyyy-mm-dd) -> einde van die dag in NL-tijd (ISO), of null. */
function geldigTotIso(waarde: FormDataEntryValue | null): string | null {
  const tekst = String(waarde ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tekst)) return null;
  // 23:59:59 Nederlandse tijd, rekening houdend met zomer-/wintertijd.
  return eindeVanDagNl(tekst);
}

async function maakCode(formData: FormData) {
  "use server";
  const ik = await vereisBeheerder("kortingscodes_beheren");
  const code = normaliseerCode(String(formData.get("code") ?? ""));
  const omschrijving = String(formData.get("omschrijving") ?? "").trim() || null;
  const soort = formData.get("soort") === "bedrag" ? "bedrag" : "percentage";
  const ruweWaarde = Number(String(formData.get("waarde") ?? "").replace(",", "."));
  const maxTekst = String(formData.get("max_gebruik") ?? "").trim();
  const maxGebruik = maxTekst ? Math.round(Number(maxTekst)) : null;

  if (!/^[A-Z0-9-]{3,40}$/.test(code)) {
    terug("Gebruik 3 tot 40 letters, cijfers of streepjes voor de code.", "fout");
  }
  if (!Number.isFinite(ruweWaarde) || ruweWaarde <= 0) terug("Vul een geldige waarde in.", "fout");
  const waarde = soort === "percentage" ? Math.round(ruweWaarde) : Math.round(ruweWaarde * 100);
  if (soort === "percentage" && (waarde < 1 || waarde > 100)) {
    terug("Een percentage ligt tussen 1 en 100.", "fout");
  }
  if (maxGebruik !== null && (!Number.isFinite(maxGebruik) || maxGebruik < 1)) {
    terug("Maximaal gebruik moet leeg zijn of minstens 1.", "fout");
  }

  const { error } = await adminClient().from("kortingscodes").insert({
    code,
    omschrijving,
    soort,
    waarde,
    geldig_tot: geldigTotIso(formData.get("geldig_tot")),
    max_gebruik: maxGebruik,
  });
  if (error) {
    terug(
      error.code === "23505" ? `De code ${code} bestaat al.` : `Opslaan mislukt: ${error.message}`,
      "fout",
    );
  }
  await logActie({
    actie: "kortingscode.maken",
    onderwerpSoort: "kortingscode",
    onderwerpId: code,
    omschrijving: `Kortingscode ${code} aangemaakt (${soort === "percentage" ? `${waarde}%` : formatteerBedrag(waarde)})`,
    details: { code, soort, waarde, max_gebruik: maxGebruik, omschrijving },
    gebruiker: ik,
  });
  revalidatePath(PAD);
  terug(`Kortingscode ${code} aangemaakt.`);
}

async function maakCadeaubon(formData: FormData) {
  "use server";
  const ik = await vereisBeheerder("kortingscodes_beheren");
  const omschrijving = String(formData.get("omschrijving") ?? "").trim() || "Cadeaubon";
  const supabase = adminClient();
  // Bij een (zeer onwaarschijnlijke) botsing opnieuw proberen.
  for (let poging = 0; poging < 3; poging++) {
    const code = cadeauboncode(randomBytes(8));
    const { error } = await supabase.from("kortingscodes").insert({
      code,
      omschrijving,
      soort: "percentage",
      waarde: 100,
      max_gebruik: 1,
      geldig_tot: geldigTotIso(formData.get("geldig_tot")),
    });
    if (!error) {
      // De code zelf is een tegoed: in het logboek alleen de laatste tekens.
      await logActie({
        actie: "kortingscode.cadeaubon_maken",
        onderwerpSoort: "kortingscode",
        omschrijving: `Cadeaubon …${code.slice(-4)} aangemaakt (100% korting, eenmalig): ${omschrijving}`,
        gebruiker: ik,
      });
      revalidatePath(PAD);
      terug(`Cadeaubon ${code} aangemaakt (eenmalig, 100% korting).`);
    }
    if (error.code !== "23505") terug(`Opslaan mislukt: ${error.message}`, "fout");
  }
  terug("Kon geen unieke cadeauboncode maken. Probeer het opnieuw.", "fout");
}

async function zetActief(formData: FormData) {
  "use server";
  const ik = await vereisBeheerder("kortingscodes_beheren");
  const id = String(formData.get("id") ?? "");
  const actief = formData.get("actief") === "1";
  const { data: rij, error } = await adminClient()
    .from("kortingscodes")
    .update({ actief })
    .eq("id", id)
    .select("code, waarde, max_gebruik, soort")
    .maybeSingle();
  if (error) terug(`Bijwerken mislukt: ${error.message}`, "fout");
  const naam = rij ? (rij.soort === "percentage" && rij.waarde === 100 && rij.max_gebruik === 1 ? `…${String(rij.code).slice(-4)}` : rij.code) : id;
  await logActie({
    actie: actief ? "kortingscode.activeren" : "kortingscode.deactiveren",
    onderwerpSoort: "kortingscode",
    onderwerpId: id,
    omschrijving: `Kortingscode ${naam} ${actief ? "geactiveerd" : "gedeactiveerd"}`,
    gebruiker: ik,
  });
  revalidatePath(PAD);
  terug(actief ? "Code weer geactiveerd." : "Code gedeactiveerd.");
}

const uitkomst = (ok: boolean, melding: string): Uitkomst => ({ ok, melding, tijd: Date.now() });

/** Hoort de code bij een gekochte cadeaubon? (Dan blijft de waarde vast.) */
async function hoortBijCadeaubon(id: string): Promise<boolean> {
  const { count } = await adminClient()
    .from("cadeaubon_bestellingen")
    .select("id", { count: "exact", head: true })
    .eq("kortingscode_id", id);
  return (count ?? 0) > 0;
}

/** Omschrijving, waarde, maximaal gebruik en geldigheid van een code wijzigen. */
async function wijzigCode(_vorige: Uitkomst | null, formData: FormData): Promise<Uitkomst> {
  "use server";
  const ik = await vereisBeheerder("kortingscodes_beheren");
  const id = String(formData.get("id") ?? "");
  const supabase = adminClient();
  const { data: oud, error } = await supabase
    .from("kortingscodes")
    .select("code, omschrijving, soort, waarde, max_gebruik, geldig_tot, aantal_gebruikt")
    .eq("id", id)
    .maybeSingle();
  if (error || !oud) return uitkomst(false, "Code niet gevonden.");
  const v = controleerCodeWijziging(
    {
      omschrijving: formData.get("omschrijving"),
      waarde: formData.get("waarde"),
      max_gebruik: formData.get("max_gebruik"),
      geldig_tot: formData.get("geldig_tot"),
    },
    { soort: oud.soort, aantalGebruikt: oud.aantal_gebruikt },
  );
  if (!v.ok) return uitkomst(false, v.fout);
  const cadeaubon = await hoortBijCadeaubon(id);
  if (cadeaubon && v.waarde.waarde !== oud.waarde) {
    return uitkomst(false, "Dit is de code van een gekochte cadeaubon: de waarde ligt vast (die is betaald).");
  }
  const nieuw = {
    omschrijving: v.waarde.omschrijving,
    waarde: v.waarde.waarde,
    max_gebruik: v.waarde.maxGebruik,
    geldig_tot: v.waarde.geldigTot ? eindeVanDagNl(v.waarde.geldigTot) : null,
  };
  const velden = (Object.keys(nieuw) as (keyof typeof nieuw)[]).filter((k) =>
    k === "geldig_tot"
      ? (oud.geldig_tot ? datumInNederland(new Date(oud.geldig_tot)) : null) !== v.waarde.geldigTot
      : (oud[k] ?? null) !== nieuw[k],
  );
  if (!velden.length) return uitkomst(true, "Er was niets gewijzigd.");
  const { error: e2 } = await supabase
    .from("kortingscodes")
    .update(Object.fromEntries(velden.map((k) => [k, nieuw[k]])))
    .eq("id", id);
  if (e2) return uitkomst(false, `Opslaan mislukt: ${e2.message}`);
  await logActie({
    actie: "kortingscode.wijzigen",
    onderwerpSoort: "kortingscode",
    onderwerpId: id,
    omschrijving: `Kortingscode ${cadeaubon ? `…${String(oud.code).slice(-4)}` : oud.code} gewijzigd: ${velden.join(", ")}`,
    details: Object.fromEntries(velden.map((k) => [k, { van: oud[k] ?? null, naar: nieuw[k] }])),
    gebruiker: ik,
  });
  revalidatePath(PAD);
  return uitkomst(true, "Opgeslagen.");
}

/**
 * Verwijdert een code die nooit is gebruikt (ook niet door een openstaande
 * bestelling) en niet bij een gekochte cadeaubon hoort. Anders: deactiveren.
 */
async function verwijderCode(_vorige: Uitkomst | null, formData: FormData): Promise<Uitkomst> {
  "use server";
  const ik = await vereisBeheerder("kortingscodes_beheren");
  const id = String(formData.get("id") ?? "");
  const supabase = adminClient();
  const { data: rij } = await supabase.from("kortingscodes").select("code, aantal_gebruikt, actief").eq("id", id).maybeSingle();
  if (!rij) return uitkomst(false, "Code niet gevonden.");
  const { count: inBestellingen } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("kortingscode", rij.code);
  const gebruikt = rij.aantal_gebruikt > 0 || (inBestellingen ?? 0) > 0 || (await hoortBijCadeaubon(id));
  if (gebruikt) {
    if (rij.actief) {
      const { error } = await supabase.from("kortingscodes").update({ actief: false }).eq("id", id);
      if (error) return uitkomst(false, `Deactiveren mislukt: ${error.message}`);
      await logActie({
        actie: "kortingscode.deactiveren",
        onderwerpSoort: "kortingscode",
        onderwerpId: id,
        omschrijving: `Kortingscode ${rij.code} gedeactiveerd (verwijderen kon niet: al gebruikt)`,
        gebruiker: ik,
      });
      revalidatePath(PAD);
    }
    return uitkomst(
      false,
      "Deze code is al gebruikt (of hoort bij een cadeaubon) en blijft daarom bewaard voor de administratie. Hij is gedeactiveerd.",
    );
  }
  const { data: weg, error } = await supabase
    .from("kortingscodes")
    .delete()
    .eq("id", id)
    .eq("aantal_gebruikt", 0)
    .select("id");
  if (error || !weg?.length) return uitkomst(false, `Verwijderen mislukt${error ? `: ${error.message}` : "."}`);
  await logActie({
    actie: "kortingscode.verwijderen",
    onderwerpSoort: "kortingscode",
    onderwerpId: id,
    omschrijving: `Kortingscode ${rij.code} verwijderd (nooit gebruikt)`,
    gebruiker: ik,
  });
  revalidatePath(PAD);
  return uitkomst(true, `Kortingscode ${rij.code} verwijderd.`);
}

function waardeLabel(c: CodeRij): string {
  return c.soort === "percentage" ? `${c.waarde}%` : formatteerBedrag(c.waarde);
}

function status(c: CodeRij): { label: string; bruikbaar: boolean } {
  if (!c.actief) return { label: "Gedeactiveerd", bruikbaar: false };
  if (c.geldig_tot && new Date(c.geldig_tot) <= new Date()) return { label: "Verlopen", bruikbaar: false };
  if (c.max_gebruik !== null && c.aantal_gebruikt >= c.max_gebruik) {
    return { label: "Opgebruikt", bruikbaar: false };
  }
  return { label: "Actief", bruikbaar: true };
}

export default async function KortingscodesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; fout?: string }>;
}) {
  const ik = await vereisBeheerder("kortingscodes");
  const magBeheren = heeftRecht(ik.rol, "kortingscodes_beheren");
  const { ok, fout } = await searchParams;

  const { data, error } = await adminClient()
    .from("kortingscodes")
    .select("id, code, omschrijving, soort, waarde, geldig_tot, max_gebruik, aantal_gebruikt, actief, aangemaakt_op")
    .order("aangemaakt_op", { ascending: false })
    .limit(500);
  const codes = (data ?? []) as CodeRij[];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 p-8">
      <AdminNav actief="/admin/kortingscodes" />
      <AdminKop
        titel={<>Kortingscodes &amp; cadeaubonnen</>}
        beschrijving={
          <>
            Klanten vullen de code in bij het bestellen. Het gebruik telt pas mee zodra de
            bestelling betaald is. Een code die de prijs volledig dekt, slaat de betaling over.
          </>
        }
      />

      {ok && (
        <p className="rounded-lg bg-accent-zacht px-4 py-3 text-sm" role="status">
          {ok}
        </p>
      )}
      {(fout || error) && (
        <p
          className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
          role="alert"
        >
          {fout ?? `Codes laden mislukt: ${error?.message}`}
        </p>
      )}

      {!magBeheren && (
        <p className="text-sm text-foreground/70">
          Je kunt de codes bekijken. Codes maken of (de)activeren kan alleen de eigenaar.
        </p>
      )}
      {magBeheren && (
        <>
      <section className="flex flex-col gap-3 rounded-xl border border-accent/40 bg-kaart p-5">
        <h2 className="text-lg font-semibold">Cadeaubon maken</h2>
        <p className="text-sm text-foreground/70">
          Maakt een unieke code voor één gratis test (100% korting, eenmalig te gebruiken).
        </p>
        <form action={maakCadeaubon} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Omschrijving (bijv. voor wie)</span>
            <input name="omschrijving" placeholder="Cadeaubon voor …" className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Geldig tot (optioneel)</span>
            <input name="geldig_tot" type="date" className={invoer} />
          </label>
          <button className={knop}>Cadeaubon maken</button>
        </form>
      </section>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Nieuwe kortingscode</h2>
        <form action={maakCode} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Code *</span>
            <input name="code" required placeholder="WELKOM10" className={`${invoer} uppercase`} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Omschrijving</span>
            <input name="omschrijving" className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Soort *</span>
            <select name="soort" defaultValue="percentage" className={invoer}>
              <option value="percentage">Percentage (%)</option>
              <option value="bedrag">Vast bedrag (€)</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Waarde * (procent of euro)</span>
            <input name="waarde" required inputMode="decimal" placeholder="10" className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Geldig tot (optioneel)</span>
            <input name="geldig_tot" type="date" className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Maximaal aantal keer (leeg = onbeperkt)</span>
            <input name="max_gebruik" type="number" min={1} className={invoer} />
          </label>
          <div className="sm:col-span-2">
            <button className={knop}>Kortingscode aanmaken</button>
          </div>
        </form>
      </section>
        </>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground/70">
          Alle codes ({codes.length})
        </h2>
        {codes.length === 0 ? (
          <p className="text-sm text-foreground/70">Nog geen kortingscodes.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {codes.map((c) => {
              const st = status(c);
              return (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-black/10 bg-kaart px-4 py-3 text-sm dark:border-white/15"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-mono font-medium">{c.code}</span>
                    <span className="text-foreground/70">
                      {waardeLabel(c)} korting
                      {c.omschrijving ? ` · ${c.omschrijving}` : ""}
                      {c.geldig_tot ? ` · t/m ${datum(c.geldig_tot)}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-foreground/70">
                      {c.aantal_gebruikt}
                      {c.max_gebruik !== null ? ` / ${c.max_gebruik}` : ""} gebruikt
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs ${
                        st.bruikbaar ? "bg-accent-zacht text-accent" : "bg-black/5 dark:bg-white/10"
                      }`}
                    >
                      {st.label}
                    </span>
                    {magBeheren && (
                      <ActieFormulier
                        actie={verwijderCode}
                        bevestig={`Kortingscode ${c.code} verwijderen? Is hij al gebruikt, dan wordt hij alleen gedeactiveerd.`}
                        stil
                      >
                        <input type="hidden" name="id" value={c.id} />
                        <button className={knopGevaarKlein}>Verwijderen</button>
                      </ActieFormulier>
                    )}
                    {magBeheren && (
                      <form action={zetActief}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="actief" value={c.actief ? "0" : "1"} />
                        <button className="text-xs text-foreground/70 underline underline-offset-4 hover:text-foreground">
                          {c.actief ? "Deactiveren" : "Activeren"}
                        </button>
                      </form>
                    )}
                  </span>
                  {magBeheren && (
                    <details className="basis-full">
                      <summary className={`w-fit cursor-pointer ${knopKlein}`}>Wijzigen</summary>
                      <ActieFormulier actie={wijzigCode} className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <input type="hidden" name="id" value={c.id} />
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-black/70 dark:text-white/70">Omschrijving</span>
                          <input name="omschrijving" defaultValue={c.omschrijving ?? ""} maxLength={200} className={invoer} />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-black/70 dark:text-white/70">
                            Waarde ({c.soort === "percentage" ? "procent" : "euro"})
                          </span>
                          <input
                            name="waarde"
                            inputMode="decimal"
                            required
                            defaultValue={c.soort === "percentage" ? String(c.waarde) : (c.waarde / 100).toFixed(2).replace(".", ",")}
                            className={invoer}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-black/70 dark:text-white/70">Maximaal aantal keer (leeg = onbeperkt)</span>
                          <input
                            name="max_gebruik"
                            type="number"
                            min={Math.max(1, c.aantal_gebruikt)}
                            defaultValue={c.max_gebruik ?? ""}
                            className={invoer}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-sm">
                          <span className="text-black/70 dark:text-white/70">Geldig tot en met (leeg = altijd)</span>
                          <input
                            name="geldig_tot"
                            type="date"
                            defaultValue={c.geldig_tot ? datumInNederland(new Date(c.geldig_tot)) : ""}
                            className={invoer}
                          />
                        </label>
                        <p className={`${tekstUitleg} sm:col-span-2`}>
                          De soort (procent of bedrag) en de code zelf liggen vast. Al gedane bestellingen veranderen niet mee.
                        </p>
                        <div className="sm:col-span-2">
                          <button className={knop}>Opslaan</button>
                        </div>
                      </ActieFormulier>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
