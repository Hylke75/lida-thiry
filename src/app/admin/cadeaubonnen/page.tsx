import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { formatteerBedrag } from "@/lib/prijs";
import { foutTekst } from "@/lib/beheermelding";
import { CADEAUBON_KOLOMMEN, verstuurBon, type CadeaubonRij } from "@/lib/cadeaubon/verwerken";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { AdminNav } from "../AdminNav";
import { Melding } from "../Melding";

export const dynamic = "force-dynamic";

const PAD = "/admin/cadeaubonnen";

const STATUS: Record<CadeaubonRij["status"], { label: string; klasse: string }> = {
  aangemaakt: { label: "Wacht op betaling", klasse: "bg-black/5 dark:bg-white/10" },
  betaald: { label: "Betaald, nog niet verstuurd", klasse: "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200" },
  verzonden: { label: "Verstuurd", klasse: "bg-accent-zacht text-accent" },
  mislukt: { label: "Betaling mislukt", klasse: "bg-black/5 dark:bg-white/10" },
  verlopen: { label: "Betaling verlopen", klasse: "bg-black/5 dark:bg-white/10" },
};

function terug(melding: string, soort: "ok" | "fout" = "ok"): never {
  redirect(`${PAD}?${soort}=${encodeURIComponent(melding)}`);
}

async function verstuurOpnieuw(formData: FormData) {
  "use server";
  await vereisBeheerder();
  const id = String(formData.get("id") ?? "");
  const kopie = formData.get("kopie") === "1";
  if (!UUID_PATROON.test(id)) terug("Onbekende cadeaubon.", "fout");
  let aan: string;
  try {
    aan = await verstuurBon(id, { kopieNaarKoper: kopie });
  } catch (e) {
    terug(`Versturen mislukt: ${foutTekst(e)}`, "fout");
  }
  revalidatePath(PAD);
  terug(`Cadeaubon verstuurd naar ${aan}.`);
}

function datum(iso: string | null): string {
  if (!iso) return "–";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Amsterdam" });
}

interface CodeInfo {
  id: string;
  code: string;
  geldig_tot: string | null;
  aantal_gebruikt: number;
  max_gebruik: number | null;
  actief: boolean;
}

export default async function CadeaubonnenPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; fout?: string; alles?: string }>;
}) {
  await vereisBeheerder();
  const { ok, fout, alles } = await searchParams;
  const supabase = adminClient();

  let query = supabase
    .from("cadeaubon_bestellingen")
    .select(CADEAUBON_KOLOMMEN)
    .order("aangemaakt_op", { ascending: false })
    .limit(300);
  if (!alles) query = query.in("status", ["betaald", "verzonden"]);
  const { data, error } = await query;
  const bonnen = (data ?? []) as CadeaubonRij[];

  const codeIds = bonnen.map((b) => b.kortingscode_id).filter((id): id is string => Boolean(id));
  const { data: codesData } = codeIds.length
    ? await supabase
        .from("kortingscodes")
        .select("id, code, geldig_tot, aantal_gebruikt, max_gebruik, actief")
        .in("id", codeIds)
    : { data: [] };
  const codes = new Map(((codesData ?? []) as CodeInfo[]).map((c) => [c.id, c]));

  // Welke bestelling heeft de code gebruikt?
  const codeTeksten = [...codes.values()].map((c) => c.code);
  const { data: gebruikData } = codeTeksten.length
    ? await supabase
        .from("orders")
        .select("id, kortingscode, klantnaam, status, aangemaakt_op")
        .in("kortingscode", codeTeksten)
        .in("status", ["betaald", "test_afgerond", "handmatige_beoordeling", "advies_verzonden"])
    : { data: [] };
  const gebruik = new Map<string, { id: string; klantnaam: string }[]>();
  for (const o of (gebruikData ?? []) as { id: string; kortingscode: string; klantnaam: string }[]) {
    gebruik.set(o.kortingscode, [...(gebruik.get(o.kortingscode) ?? []), o]);
  }

  // Factuurlinks (tijdelijk geldig).
  const paden = bonnen.map((b) => b.factuur_pad).filter((p): p is string => Boolean(p));
  const factuurUrls = new Map<string, string>();
  if (paden.length) {
    const { data: urls } = await supabase.storage.from("facturen").createSignedUrls(paden, 3600);
    for (const u of urls ?? []) if (u.path && u.signedUrl) factuurUrls.set(u.path, u.signedUrl);
  }

  const totaal = bonnen
    .filter((b) => b.status === "betaald" || b.status === "verzonden")
    .reduce((som, b) => som + b.bedrag_cent, 0);

  const knopKlein =
    "text-xs text-black/60 underline underline-offset-4 hover:text-black dark:text-white/60 dark:hover:text-white";

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 p-8">
      <AdminNav actief="/admin/cadeaubonnen" />
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Cadeaubonnen</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Cadeaubonnen die via <Link href="/cadeaubon" className="underline underline-offset-2">/cadeaubon</Link> zijn
          gekocht. Na betaling krijgt elke bon een eigen eenmalige code (zie ook{" "}
          <Link href="/admin/kortingscodes" className="underline underline-offset-2">Kortingscodes</Link>). Geplande bonnen
          gaan op de gekozen dag mee met de nachtelijke controle.
        </p>
        <p className="text-sm">
          {alles ? (
            <Link href={PAD} className="underline underline-offset-4">Alleen betaalde bonnen tonen</Link>
          ) : (
            <Link href={`${PAD}?alles=1`} className="underline underline-offset-4">Ook onbetaalde pogingen tonen</Link>
          )}
          <span className="ml-3 text-black/50 dark:text-white/50">Totaal betaald (in deze lijst): {formatteerBedrag(totaal)}</span>
        </p>
      </header>

      {ok && <Melding soort="ok">{ok}</Melding>}
      {(fout || error) && <Melding soort="fout">{fout ?? `Cadeaubonnen laden mislukt: ${error?.message}`}</Melding>}

      {bonnen.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">Nog geen cadeaubonnen.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {bonnen.map((b) => {
            const st = STATUS[b.status];
            const code = b.kortingscode_id ? codes.get(b.kortingscode_id) : undefined;
            const gebruikt = code ? (gebruik.get(code.code) ?? []) : [];
            const factuurUrl = b.factuur_pad ? factuurUrls.get(b.factuur_pad) : undefined;
            const betaald = b.status === "betaald" || b.status === "verzonden";
            return (
              <li
                key={b.id}
                className="flex flex-col gap-3 rounded-lg border border-black/10 bg-kaart px-4 py-3 text-sm dark:border-white/15"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col">
                    <span className="font-medium">
                      {formatteerBedrag(b.bedrag_cent, b.valuta || "EUR")} · {b.koper_naam}{" "}
                      <span className="font-normal text-black/50 dark:text-white/50">({b.koper_email})</span>
                    </span>
                    <span className="text-black/60 dark:text-white/60">
                      {b.bezorging === "ontvanger"
                        ? `Naar ontvanger: ${b.ontvanger_naam ?? "–"} (${b.ontvanger_email ?? "–"})${b.verzend_op ? ` · gepland op ${datum(b.verzend_op)}` : ""}`
                        : `Naar de koper${b.ontvanger_naam ? ` · voor ${b.ontvanger_naam}` : ""}`}
                    </span>
                    <span className="text-black/50 dark:text-white/50">
                      Besteld {datum(b.aangemaakt_op)}
                      {b.betaald_op ? ` · betaald ${datum(b.betaald_op)}` : ""}
                      {b.verzonden_op ? ` · verstuurd ${datum(b.verzonden_op)}` : ""}
                      {factuurUrl ? (
                        <>
                          {" · "}
                          <a href={factuurUrl} className="text-accent underline underline-offset-2">
                            factuur {b.factuur_pad?.replace(/\.pdf$/, "")}
                          </a>
                        </>
                      ) : null}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs ${st.klasse}`}>{st.label}</span>
                </div>

                {betaald && (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-3 dark:border-white/10">
                    <span className="flex flex-col">
                      {code ? (
                        <>
                          <span className="font-mono font-medium">{code.code}</span>
                          <span className="text-black/50 dark:text-white/50">
                            {code.aantal_gebruikt}
                            {code.max_gebruik !== null ? ` / ${code.max_gebruik}` : ""} gebruikt
                            {code.geldig_tot ? ` · geldig t/m ${datum(code.geldig_tot)}` : ""}
                            {!code.actief ? " · gedeactiveerd" : ""}
                            {gebruikt.map((o) => (
                              <span key={o.id}>
                                {" · "}
                                <Link href={`/admin/order/${o.id}`} className="underline underline-offset-2">
                                  bestelling van {o.klantnaam}
                                </Link>
                              </span>
                            ))}
                          </span>
                        </>
                      ) : (
                        <span className="text-black/50 dark:text-white/50">Nog geen code (wordt aangemaakt bij versturen).</span>
                      )}
                    </span>
                    <span className="flex flex-wrap items-center gap-3">
                      <form action={verstuurOpnieuw}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className={knopKlein}>
                          {b.status === "verzonden" ? "Bon opnieuw versturen" : "Bon nu versturen"}
                        </button>
                      </form>
                      {b.bezorging === "ontvanger" && (
                        <form action={verstuurOpnieuw}>
                          <input type="hidden" name="id" value={b.id} />
                          <input type="hidden" name="kopie" value="1" />
                          <button className={knopKlein}>Kopie naar koper</button>
                        </form>
                      )}
                    </span>
                  </div>
                )}
                {b.boodschap && (
                  <p className="border-t border-black/5 pt-3 whitespace-pre-line text-black/60 italic dark:border-white/10 dark:text-white/60">
                    “{b.boodschap}”
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
