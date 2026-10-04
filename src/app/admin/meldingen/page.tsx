import type { Metadata } from "next";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { vapidPubliekeSleutel } from "@/lib/push/versturen";
import { AdminNav, Melding } from "../AdminNav";
import { PushBeheer, type Apparaat } from "./PushBeheer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Meldingen · Beheer" };

export default async function MeldingenPagina() {
  const gebruiker = await vereisBeheerder();
  const { data, error } = await adminClient()
    .from("push_abonnementen")
    .select("id, endpoint, apparaat, meldingen, aangemaakt_op, laatst_gebruikt_op")
    .eq("gebruiker_id", gebruiker.id)
    .order("aangemaakt_op", { ascending: false });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/meldingen" />
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Pushmeldingen</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Krijg een melding op je telefoon of computer bij een betaalde bestelling, een nieuw contactbericht, een nieuwe
          afspraak of een nieuwe review. Je kiest per apparaat welke meldingen je wilt.
        </p>
      </header>
      {error && <Melding soort="fout">Je apparaten laden is mislukt: {error.message}</Melding>}
      <PushBeheer publiekeSleutel={vapidPubliekeSleutel()} apparaten={(data ?? []) as Apparaat[]} />
    </main>
  );
}
