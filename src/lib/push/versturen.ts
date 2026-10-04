import "server-only";
import webpush from "web-push";
import { adminClient } from "@/lib/supabase/admin";
import {
  bouwPayload,
  isVerlopen,
  vapidCompleet,
  type PushAbonnement,
  type PushBericht,
  type PushSoort,
} from "./regels";

export type { PushBericht, PushSoort } from "./regels";

export interface PushResultaat {
  verstuurd: number;
  mislukt: number;
  /** Verlopen abonnementen (404/410) die zijn opgeruimd. */
  verwijderd: number;
}

const LEEG: PushResultaat = { verstuurd: 0, mislukt: 0, verwijderd: 0 };

function vapidEnv() {
  return {
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  };
}

/** De openbare VAPID-sleutel (voor de browser), of null als push niet is ingesteld. */
export function vapidPubliekeSleutel(): string | null {
  return vapidCompleet(vapidEnv()) ? (process.env.VAPID_PUBLIC_KEY ?? "").trim() : null;
}

function vapidDetails() {
  if (!vapidCompleet(vapidEnv())) return null;
  return {
    subject: (process.env.VAPID_SUBJECT ?? "").trim(),
    publicKey: (process.env.VAPID_PUBLIC_KEY ?? "").trim(),
    privateKey: (process.env.VAPID_PRIVATE_KEY ?? "").trim(),
  };
}

interface AbonnementRij extends PushAbonnement {
  id: string;
}

/** Stuurt één payload naar een lijst abonnementen; ruimt verlopen abonnementen op. Gooit nooit. */
async function verstuur(rijen: readonly AbonnementRij[], payload: string): Promise<PushResultaat> {
  const vapid = vapidDetails();
  if (!vapid || rijen.length === 0) return LEEG;
  const uitkomsten = await Promise.allSettled(
    rijen.map((r) =>
      webpush.sendNotification({ endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } }, payload, {
        vapidDetails: vapid,
        TTL: 60 * 60 * 24,
        urgency: "high",
        timeout: 8000,
      }),
    ),
  );

  const gelukt: string[] = [];
  const verlopen: string[] = [];
  let mislukt = 0;
  uitkomsten.forEach((u, i) => {
    if (u.status === "fulfilled") gelukt.push(rijen[i].id);
    else if (isVerlopen((u.reason as { statusCode?: unknown } | null)?.statusCode)) verlopen.push(rijen[i].id);
    else {
      mislukt++;
      console.error("Pushmelding mislukt", new URL(rijen[i].endpoint).host, u.reason);
    }
  });

  try {
    const supabase = adminClient();
    await Promise.all([
      verlopen.length ? supabase.from("push_abonnementen").delete().in("id", verlopen) : null,
      gelukt.length
        ? supabase.from("push_abonnementen").update({ laatst_gebruikt_op: new Date().toISOString() }).in("id", gelukt)
        : null,
    ]);
  } catch (e) {
    console.error("Pushabonnementen bijwerken mislukt", e);
  }
  return { verstuurd: gelukt.length, mislukt: mislukt, verwijderd: verlopen.length };
}

/**
 * Stuurt een pushmelding naar alle beheerders die meldingen van deze soort
 * hebben aangezet (op elk aangemeld apparaat). Verlopen abonnementen (404/410)
 * worden verwijderd. Gooit nooit en doet niets als push niet is ingesteld
 * (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT).
 *
 * Voorbeeld:
 *   await stuurPushMelding("afspraak", { titel: "Nieuwe afspraak", tekst: "Anna, di 14 okt 10:00", url: `/admin/afspraken/${id}` });
 */
export async function stuurPushMelding(soort: PushSoort, bericht: PushBericht): Promise<PushResultaat> {
  try {
    if (!vapidDetails()) return LEEG;
    const supabase = adminClient();
    const [abonnementen, beheerders] = await Promise.all([
      supabase.from("push_abonnementen").select("id, gebruiker_id, endpoint, p256dh, auth").contains("meldingen", [soort]),
      supabase.from("beheerders").select("gebruiker_id"),
    ]);
    if (abonnementen.error) throw new Error(abonnementen.error.message);
    if (beheerders.error) throw new Error(beheerders.error.message);
    // Alleen wie (nog) beheerder is.
    const toegestaan = new Set((beheerders.data ?? []).map((b) => b.gebruiker_id as string));
    const rijen = ((abonnementen.data ?? []) as (AbonnementRij & { gebruiker_id: string })[]).filter((r) =>
      toegestaan.has(r.gebruiker_id),
    );
    return await verstuur(rijen, JSON.stringify(bouwPayload(soort, bericht)));
  } catch (e) {
    console.error("Pushmelding versturen mislukt", soort, e);
    return LEEG;
  }
}

/** Testmelding naar alle apparaten van één beheerder (los van de gekozen soorten). Gooit nooit. */
export async function stuurTestMelding(gebruikerId: string): Promise<PushResultaat> {
  try {
    if (!vapidDetails()) return LEEG;
    const { data, error } = await adminClient()
      .from("push_abonnementen")
      .select("id, endpoint, p256dh, auth")
      .eq("gebruiker_id", gebruikerId);
    if (error) throw new Error(error.message);
    const payload = bouwPayload("test", {
      titel: "Testmelding",
      tekst: "Pushmeldingen werken op dit apparaat.",
      url: "/admin/meldingen",
    });
    return await verstuur((data ?? []) as AbonnementRij[], JSON.stringify(payload));
  } catch (e) {
    console.error("Testmelding versturen mislukt", e);
    return LEEG;
  }
}
