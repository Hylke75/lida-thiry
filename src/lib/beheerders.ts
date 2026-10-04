import "server-only";
import { Resend } from "resend";
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

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Stuurt de uitnodiging of inloglink. Gooit een fout als dat niet lukt (bijv.
 * geen RESEND_API_KEY, of het testadres van Resend dat alleen naar de eigenaar
 * van het Resend-account mag sturen).
 */
export async function stuurBeheerderMail(opts: { aan: string; link: string | null; nieuw: boolean }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY ontbreekt.");
  const knop = (href: string, tekst: string) =>
    `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none">${tekst}</a></p>`;
  const inhoud = opts.link
    ? `<h1 style="font-size:18px">${opts.nieuw ? "Je bent uitgenodigd voor het beheer" : "Inloggen in het beheer"}</h1>
       <p>${opts.nieuw ? "Je hebt toegang gekregen tot het beheer van de website van Lida Thiry Imago &amp; Kledingadvies." : "Hier is een link om in te loggen in het beheer."} Klik op de knop en kies daarna een eigen wachtwoord.</p>
       ${knop(opts.link, opts.nieuw ? "Uitnodiging accepteren" : "Inloggen en wachtwoord instellen")}
       <p style="font-size:13px;color:#555">De link werkt één keer en is beperkt geldig (standaard 1 uur). Werkt hij niet meer, vraag dan om een nieuwe.</p>`
    : `<h1 style="font-size:18px">Je hebt toegang tot het beheer</h1>
       <p>Je kunt nu inloggen in het beheer van de website van Lida Thiry Imago &amp; Kledingadvies met je bestaande e-mailadres en wachtwoord.</p>
       ${knop(`${siteUrl()}/admin/inloggen`, "Naar het beheer")}`;
  const { error } = await new Resend(key).emails.send({
    from: process.env.RESEND_VAN || "Lida Thiry <onboarding@resend.dev>",
    to: opts.aan,
    subject: opts.link && opts.nieuw ? "Uitnodiging voor het beheer" : "Toegang tot het beheer",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.6">${inhoud}</div>`,
  });
  if (error) throw new Error(error.message);
}
