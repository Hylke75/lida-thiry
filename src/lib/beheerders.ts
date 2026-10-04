import "server-only";
import type { User } from "@supabase/supabase-js";
import { adminClient } from "./supabase/admin";
import { siteUrl } from "./site";

export interface BeheerderRij {
  gebruiker_id: string;
  email: string;
  aangemaakt_op: string;
  laatstIngelogd: string | null;
  /** Uitgenodigd maar nog nooit ingelogd. */
  uitgenodigd: boolean;
}

/** Alle beheerders met gegevens uit Supabase-auth (er zijn er maar een paar). */
export async function lijstBeheerders(): Promise<BeheerderRij[]> {
  const db = adminClient();
  const { data, error } = await db
    .from("beheerders")
    .select("gebruiker_id, email, aangemaakt_op")
    .order("aangemaakt_op");
  if (error) throw new Error(`beheerders lezen: ${error.message}`);
  const rijen = (data ?? []) as { gebruiker_id: string; email: string | null; aangemaakt_op: string }[];
  const gebruikers = await Promise.all(
    rijen.map(async (r) => (await db.auth.admin.getUserById(r.gebruiker_id)).data.user ?? null),
  );
  return rijen.map((r, i) => {
    const u = gebruikers[i];
    return {
      gebruiker_id: r.gebruiker_id,
      email: u?.email ?? r.email ?? "(onbekend)",
      aangemaakt_op: r.aangemaakt_op,
      laatstIngelogd: u?.last_sign_in_at ?? null,
      uitgenodigd: Boolean(u && !u.last_sign_in_at),
    };
  });
}

/** Zoekt een bestaande auth-gebruiker op e-mailadres (blader door de gebruikerslijst). */
export async function zoekGebruiker(email: string): Promise<User | null> {
  const db = adminClient();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`gebruikers lezen: ${error.message}`);
    const gevonden = data.users.find((u) => u.email?.toLowerCase() === email);
    if (gevonden) return gevonden;
    if (data.users.length < 1000) break;
  }
  return null;
}

export type LinkSoort = "invite" | "recovery";

/**
 * Maakt een eenmalige inloglink naar onze eigen bevestigingspagina. Bij "invite"
 * maakt Supabase het account aan. Na het klikken is de beheerder ingelogd en
 * komt die op de beheerderspagina om een wachtwoord in te stellen.
 */
export async function maakInlogLink(email: string, soort: LinkSoort): Promise<{ link: string; user: User }> {
  const { data, error } = await adminClient().auth.admin.generateLink({ type: soort, email });
  if (error || !data.user) throw new Error(error?.message ?? "Geen gebruiker ontvangen.");
  const p = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: soort,
    next: "/admin/beheerders?welkom=1",
  });
  return { link: `${siteUrl()}/auth/bevestig?${p.toString()}`, user: data.user };
}

