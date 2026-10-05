import "server-only";
import { adminClient } from "../supabase/admin";
import { leesInstelling } from "../instellingen";
import { stuurReviewUitnodiging } from "../resend";
import { foutTekst } from "../beheermelding";
import {
  leesReviewDagen,
  naamSuggestie,
  reviewVenster,
  selecteerUitTeNodigen,
  voornaamVoorAanhef,
  type KandidaatOrder,
} from "./regels";

type Supabase = ReturnType<typeof adminClient>;

const ORDER_KOLOMMEN = "id, email, klantnaam, status, afgerond_op, bedrag_cent, kortingscode, factuurgegevens";
type OrderRij = KandidaatOrder & { factuurgegevens: Record<string, unknown> | null };

/** Maximaal aantal uitnodigingen per nacht (ruim; voorkomt een mailpiek). */
const PER_RONDE = 100;
/** Bestellingen per pagina, en het maximale aantal pagina's per ronde. */
const PAGINA = 200;
const MAX_PAGINAS = 25;

/** Voornaam en plaats uit het adresboek, per e-mailadres (kleine letters). */
async function adresboek(
  supabase: Supabase,
  emails: readonly string[],
): Promise<Map<string, { voornaam: string | null; plaats: string | null }>> {
  const uniek = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (!uniek.length) return new Map();
  const { data } = await supabase.from("relaties").select("email, voornaam, plaats").in("email", uniek);
  return new Map(
    (data ?? []).map((r) => [r.email as string, { voornaam: r.voornaam as string | null, plaats: r.plaats as string | null }]),
  );
}

function plaatsUitFactuur(f: Record<string, unknown> | null): string | null {
  const p = f?.plaats;
  return typeof p === "string" && p.trim() ? p.trim() : null;
}

/**
 * Maakt de reviewrij aan en verstuurt de mail. Lukt de mail niet, dan gaat de
 * rij weer weg, zodat de volgende ronde het opnieuw probeert. Geeft false als
 * er al een review voor de bestelling bestaat.
 */
async function nodigUit(
  supabase: Supabase,
  o: OrderRij,
  boek: Map<string, { voornaam: string | null; plaats: string | null }>,
): Promise<boolean> {
  const email = o.email.trim().toLowerCase();
  const relatie = boek.get(email);
  const naam = naamSuggestie({
    voornaam: relatie?.voornaam,
    klantnaam: o.klantnaam,
    plaats: relatie?.plaats || plaatsUitFactuur(o.factuurgegevens),
  });
  const { data, error } = await supabase
    .from("beoordelingen")
    .insert({ order_id: o.id, email, naam: naam || null, status: "uitgenodigd" })
    .select("id, token")
    .single();
  if (error) {
    if (error.code === "23505") return false; // al uitgenodigd (bijv. door een gelijktijdige ronde)
    throw new Error(`Review aanmaken mislukt: ${error.message}`);
  }
  try {
    await stuurReviewUitnodiging({ email, naam: voornaamVoorAanhef(o.klantnaam, relatie?.voornaam), token: data.token });
  } catch (e) {
    await supabase.from("beoordelingen").delete().eq("id", data.id);
    throw e;
  }
  await supabase.from("beoordelingen").update({ uitgenodigd_op: new Date().toISOString() }).eq("id", data.id);
  return true;
}

/**
 * Nachtelijke ronde (vanuit /api/onderhoud/opschonen): vraagt klanten van wie
 * het advies `review_na_dagen` dagen geleden is verzonden (en niet langer dan
 * 60 dagen) om een review. Testbestellingen worden overgeslagen. Gooit niet.
 */
export async function nodigUitVoorReviews(
  supabase: Supabase = adminClient(),
): Promise<{ verstuurd: number; mislukt: string[] }> {
  const mislukt: string[] = [];
  let verstuurd = 0;
  try {
    const naDagen = leesReviewDagen(await leesInstelling("review_na_dagen"));
    const nu = new Date();
    const { van, tot } = reviewVenster(nu, naDagen);
    // Bladeren tot er genoeg kandidaten zijn: anders blijft de ronde hangen op
    // de oudste bestellingen die al een review hebben.
    const kandidaten: OrderRij[] = [];
    const gezienEmails = new Set<string>();
    for (let pagina = 0; pagina < MAX_PAGINAS && kandidaten.length < PER_RONDE; pagina++) {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(ORDER_KOLOMMEN)
        .eq("status", "advies_verzonden")
        .gte("afgerond_op", van.toISOString())
        .lte("afgerond_op", tot.toISOString())
        .order("afgerond_op", { ascending: true })
        .order("id", { ascending: true })
        .range(pagina * PAGINA, pagina * PAGINA + PAGINA - 1);
      if (error) return { verstuurd, mislukt: [`Bestellingen ophalen mislukt: ${error.message}`] };
      const lijst = (orders ?? []) as OrderRij[];
      if (!lijst.length) break;

      const { data: bestaand, error: e2 } = await supabase
        .from("beoordelingen")
        .select("order_id")
        .in(
          "order_id",
          lijst.map((o) => o.id),
        );
      if (e2) return { verstuurd, mislukt: [`Reviews ophalen mislukt: ${e2.message}`] };
      // Ook klanten die eerder (bij een andere bestelling) al zijn uitgenodigd, overslaan.
      const emails = [...new Set(lijst.map((o) => o.email.trim().toLowerCase()))];
      const { data: perEmail, error: e3 } = await supabase.from("beoordelingen").select("email").in("email", emails);
      if (e3) return { verstuurd, mislukt: [`Reviews ophalen mislukt: ${e3.message}`] };
      const bekendeEmails = new Set((perEmail ?? []).map((r) => r.email as string));

      const metReview = new Set((bestaand ?? []).map((r) => r.order_id as string));
      for (const o of selecteerUitTeNodigen(lijst, metReview, nu, naDagen) as OrderRij[]) {
        const email = o.email.trim().toLowerCase();
        // Eén uitnodiging per klant per ronde, ook als die meerdere bestellingen heeft.
        if (bekendeEmails.has(email) || gezienEmails.has(email)) continue;
        gezienEmails.add(email);
        if (kandidaten.length < PER_RONDE) kandidaten.push(o);
      }
      if (lijst.length < PAGINA) break;
    }
    if (!kandidaten.length) return { verstuurd, mislukt };
    const boek = await adresboek(
      supabase,
      kandidaten.map((o) => o.email),
    );
    for (const o of kandidaten) {
      try {
        if (await nodigUit(supabase, o, boek)) verstuurd++;
      } catch (e) {
        console.error("Review-uitnodiging mislukt", o.id, e);
        mislukt.push(`${o.id} (${o.email}): ${foutTekst(e)}`);
      }
    }
  } catch (e) {
    mislukt.push(`Review-uitnodigingen: ${foutTekst(e)}`);
  }
  return { verstuurd, mislukt };
}

/**
 * Handmatige uitnodiging vanuit het beheer, voor één bestelling (ook buiten de
 * termijn en ook voor testbestellingen, handig om te proberen). Een eerder
 * verwijderde review van deze bestelling wordt eerst opgeruimd.
 * Gooit een Error met een leesbare melding als het niet kan.
 */
export async function nodigOrderUit(orderId: string): Promise<{ email: string }> {
  const supabase = adminClient();
  const { data, error } = await supabase.from("orders").select(ORDER_KOLOMMEN).eq("id", orderId).maybeSingle();
  if (error) throw new Error(`Bestelling ophalen mislukt: ${error.message}`);
  if (!data) throw new Error("Bestelling niet gevonden.");
  const o = data as OrderRij;
  if (o.status !== "advies_verzonden") {
    throw new Error("Deze bestelling heeft (nog) geen verzonden advies; uitnodigen kan pas daarna.");
  }
  const { data: bestaand } = await supabase
    .from("beoordelingen")
    .select("id, email, status")
    .eq("order_id", orderId)
    .maybeSingle();
  if (bestaand) {
    if (bestaand.email) {
      throw new Error("Voor deze bestelling bestaat al een review. Gebruik daar ‘Uitnodiging opnieuw sturen’.");
    }
    await supabase.from("beoordelingen").delete().eq("id", bestaand.id); // verwijderde review
  }
  const boek = await adresboek(supabase, [o.email]);
  if (!(await nodigUit(supabase, o, boek))) throw new Error("Voor deze bestelling bestaat al een review.");
  return { email: o.email };
}

/** Stuurt de uitnodiging van een (nog niet ingevulde) review nog een keer. */
export async function stuurUitnodigingOpnieuw(reviewId: string): Promise<{ email: string }> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("beoordelingen")
    .select("id, token, email, status, order_id")
    .eq("id", reviewId)
    .maybeSingle();
  if (error) throw new Error(`Review ophalen mislukt: ${error.message}`);
  if (!data?.email) throw new Error("Review niet gevonden of zonder e-mailadres.");
  if (data.status !== "uitgenodigd") throw new Error("Deze review is al ingevuld.");
  let klantnaam: string | null = null;
  if (data.order_id) {
    const { data: o } = await supabase.from("orders").select("klantnaam").eq("id", data.order_id).maybeSingle();
    klantnaam = (o?.klantnaam as string | undefined) ?? null;
  }
  const boek = await adresboek(supabase, [data.email]);
  await stuurReviewUitnodiging({
    email: data.email,
    naam: voornaamVoorAanhef(klantnaam, boek.get(data.email)?.voornaam),
    token: data.token,
  });
  await supabase.from("beoordelingen").update({ uitgenodigd_op: new Date().toISOString() }).eq("id", data.id);
  return { email: data.email };
}
