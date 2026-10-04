import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { adminClient } from "./supabase/admin";
import { heeftRecht, leesRol, type Recht, type Rol } from "./rollen";
import { geverifieerdeFactoren, mfaUitkomst, mfaVerplicht, type MfaNiveau, type MfaUitkomst } from "./mfa-regels";

/** De ingelogde beheerder: de Supabase-gebruiker plus zijn rol. */
export type Beheerder = User & { rol: Rol };

export interface BeheerStatus {
  user: User;
  rol: Rol;
  /** Heeft een geverifieerde factor (authenticator-app). */
  heeftFactor: boolean;
  /** Niveau van deze sessie: aal2 = met code bevestigd. */
  niveau: MfaNiveau;
  /** Tweestapsverificatie is verplicht (instelling mfa_verplicht = 'ja'). */
  verplicht: boolean;
  mfa: MfaUitkomst;
}

type Uitkomst = BeheerStatus | "geen_sessie" | "geen_beheerder";

async function leesMfaVerplicht(): Promise<boolean> {
  try {
    const { data, error } = await adminClient()
      .from("instellingen")
      .select("waarde")
      .eq("sleutel", "mfa_verplicht")
      .maybeSingle();
    if (error) return false;
    return mfaVerplicht((data as { waarde: string | null } | null)?.waarde);
  } catch {
    // Instelling niet te lezen: niet iedereen buitensluiten. Wie al een factor
    // heeft, moet die hoe dan ook gebruiken.
    return false;
  }
}

async function leesRolVan(supabase: Awaited<ReturnType<typeof createClient>>, id: string): Promise<Rol | null> {
  const { data, error } = await supabase.from("beheerders").select("gebruiker_id, rol").eq("gebruiker_id", id).maybeSingle();
  if (!error) return data ? leesRol((data as { rol?: unknown }).rol) : null;
  // Kolom 'rol' (nog) niet aanwezig: gedraag je zoals vóór de rollen.
  const oud = await supabase.from("beheerders").select("gebruiker_id").eq("gebruiker_id", id).maybeSingle();
  return oud.data ? "eigenaar" : null;
}

/** Eén keer per verzoek: wie is ingelogd, met welke rol en hoe staat het met de tweestapsverificatie. */
const leesStatus = cache(async (): Promise<Uitkomst> => {
  const supabase = await createClient();
  // getUser() controleert het token bij Supabase; de factoren komen dus van de server.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "geen_sessie";

  const rol = await leesRolVan(supabase, user.id);
  if (!rol) return "geen_beheerder";

  const heeftFactor = geverifieerdeFactoren(user.factors).length > 0;
  // Het aal-niveau komt uit het (zojuist door getUser gecontroleerde) toegangstoken.
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const niveau = (aal?.currentLevel ?? null) as MfaNiveau;
  const verplicht = heeftFactor ? false : await leesMfaVerplicht();
  return { user, rol, heeftFactor, niveau, verplicht, mfa: mfaUitkomst({ heeftFactor, niveau, verplicht }) };
});

/**
 * De status van de ingelogde beheerder zonder door te sturen (null als er geen
 * beheerder is ingelogd). Voor navigatie en tellers; gebruik voor toegang
 * altijd vereisBeheerder().
 */
export async function huidigeBeheerder(): Promise<BeheerStatus | null> {
  const s = await leesStatus();
  return typeof s === "string" ? null : s;
}

/** Of de ingelogde beheerder (volledig ingelogd) dit recht heeft. Stuurt nooit door. */
export async function magBeheerder(recht: Recht): Promise<boolean> {
  const s = await huidigeBeheerder();
  return Boolean(s && s.mfa === "ok" && heeftRecht(s.rol, recht));
}

export interface VereisOpties {
  /**
   * Ook toestaan als tweestapsverificatie verplicht is maar nog niet is
   * ingesteld (alleen voor de beveiligingspagina en het eigen wachtwoord).
   */
  zonderVerplichteMfa?: boolean;
}

/**
 * Vereist een ingelogde beheerder (en optioneel een recht). Stuurt door naar:
 * - de inlogpagina zonder sessie of zonder beheerdersrij;
 * - de code-stap van het inloggen als de gebruiker tweestapsverificatie heeft en
 *   deze sessie nog niet met een code is bevestigd (aal2 vereist);
 * - /admin/beveiliging als tweestapsverificatie verplicht is en nog ontbreekt;
 * - /admin/geen-toegang als de rol het recht niet heeft.
 * Retourneert de gebruiker, aangevuld met `rol`.
 */
export async function vereisBeheerder(recht?: Recht, opties: VereisOpties = {}): Promise<Beheerder> {
  const s = await leesStatus();
  if (s === "geen_sessie") redirect("/admin/inloggen");
  if (s === "geen_beheerder") redirect("/admin/inloggen?geen_toegang=1");
  if (s.mfa === "code_nodig") redirect("/admin/inloggen?stap=code");
  if (s.mfa === "instellen_nodig" && !opties.zonderVerplichteMfa) redirect("/admin/beveiliging?verplicht=1");
  if (recht && !heeftRecht(s.rol, recht)) redirect(`/admin/geen-toegang?recht=${encodeURIComponent(recht)}`);
  return Object.assign(s.user, { rol: s.rol });
}

/** Kortere vorm: vereisRecht("blog") is vereisBeheerder("blog"). */
export function vereisRecht(recht: Recht): Promise<Beheerder> {
  return vereisBeheerder(recht);
}
