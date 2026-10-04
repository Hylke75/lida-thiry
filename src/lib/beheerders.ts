import "server-only";
import type { User } from "@supabase/supabase-js";
import { adminClient } from "./supabase/admin";
import { siteUrl } from "./site";
import { leesRol, type Rol } from "./rollen";
import { geverifieerdeFactoren } from "./mfa-regels";

export interface BeheerderRij {
  gebruiker_id: string;
  email: string;
  aangemaakt_op: string;
  laatstIngelogd: string | null;
  /** Uitgenodigd maar nog nooit ingelogd. */
  uitgenodigd: boolean;
  rol: Rol;
  /** Heeft tweestapsverificatie (een geverifieerde authenticator-app). */
  tweestap: boolean;
}

type RuweRij = { gebruiker_id: string; email: string | null; aangemaakt_op: string; rol?: unknown };

/** De beheerdersrijen; zonder kolom 'rol' (oude database) is iedereen eigenaar. */
async function leesRijen(): Promise<RuweRij[]> {
  const db = adminClient();
  const metRol = await db.from("beheerders").select("gebruiker_id, email, aangemaakt_op, rol").order("aangemaakt_op");
  if (!metRol.error) return (metRol.data ?? []) as RuweRij[];
  const { data, error } = await db.from("beheerders").select("gebruiker_id, email, aangemaakt_op").order("aangemaakt_op");
  if (error) throw new Error(`beheerders lezen: ${error.message}`);
  return (data ?? []) as RuweRij[];
}

/** Rol van één beheerder (null als die geen beheerder is). */
export async function rolVan(gebruikerId: string): Promise<Rol | null> {
  const rijen = await leesRijen();
  const rij = rijen.find((r) => r.gebruiker_id === gebruikerId);
  return rij ? leesRol(rij.rol) : null;
}

/** Aantal beheerders en eigenaren. */
export async function telBeheerders(): Promise<{ beheerders: number; eigenaren: number; rollen: Map<string, Rol> }> {
  const rijen = await leesRijen();
  const rollen = new Map(rijen.map((r) => [r.gebruiker_id, leesRol(r.rol)] as const));
  return { beheerders: rijen.length, eigenaren: [...rollen.values()].filter((r) => r === "eigenaar").length, rollen };
}

/** Alle beheerders met gegevens uit Supabase-auth (er zijn er maar een paar). */
export async function lijstBeheerders(): Promise<BeheerderRij[]> {
  const db = adminClient();
  const rijen = await leesRijen();
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
      rol: leesRol(r.rol),
      tweestap: geverifieerdeFactoren(u?.factors).length > 0,
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
 * komt die op de beveiligingspagina om een wachtwoord in te stellen.
 */
export async function maakInlogLink(email: string, soort: LinkSoort): Promise<{ link: string; user: User }> {
  const { data, error } = await adminClient().auth.admin.generateLink({ type: soort, email });
  if (error || !data.user) throw new Error(error?.message ?? "Geen gebruiker ontvangen.");
  const p = new URLSearchParams({
    token_hash: data.properties.hashed_token,
    type: soort,
    // De beveiligingspagina is er voor elke rol (wachtwoord en tweestapsverificatie).
    next: "/admin/beveiliging?welkom=1",
  });
  return { link: `${siteUrl()}/auth/bevestig?${p.toString()}`, user: data.user };
}

