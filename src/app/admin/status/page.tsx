import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { vereisBeheerder } from "@/lib/admin-auth";
import { AdminNav } from "../AdminNav";
import { AdminKop } from "@/components/admin/AdminKop";
import { kaartVlak, tekstZacht } from "@/components/admin/stijl";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verbindingsstatus · Beheer", robots: { index: false, follow: false } };

/**
 * Verbindingsstatus (configuratie en Supabase-verbinding). Toont interne
 * informatie, dus alleen voor beheerders; vroeger op /status (dat stuurt hierheen).
 */
export default async function StatusPagina() {
  await vereisBeheerder("overzicht");

  const urlSet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const keySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let verbonden = false;
  let detail = "";
  try {
    const supabase = await createClient();
    // getUser() bereikt de Supabase-auth-server; geen tabellen nodig.
    const { error } = await supabase.auth.getUser();
    // "Auth session missing" is normaal zonder ingelogde gebruiker = verbinding OK.
    verbonden = !error || error.name === "AuthSessionMissingError";
    detail = error ? error.message : "OK";
  } catch (e) {
    detail = e instanceof Error ? e.message : "Onbekende fout";
  }

  const rijen: { label: string; ok: boolean; waarde: string }[] = [
    { label: "NEXT_PUBLIC_SUPABASE_URL", ok: urlSet, waarde: urlSet ? "gezet" : "ontbreekt" },
    { label: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: keySet, waarde: keySet ? "gezet" : "ontbreekt" },
    { label: "Supabase-verbinding", ok: verbonden, waarde: detail },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/fouten" />
      <AdminKop
        titel="Verbindingsstatus"
        terug={{ href: "/admin/fouten", label: "Fouten" }}
        beschrijving={
          <>
            Of de website de database kan bereiken en de belangrijkste sleutels heeft. Meer controles staan in de lijst{" "}
            <Link href="/admin" className="underline underline-offset-4">
              Klaar voor livegang
            </Link>
            .
          </>
        }
      />
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rijen.map((r) => (
          <li
            key={r.label}
            className={`${kaartVlak} flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4`}
          >
            <span className="break-all font-mono">{r.label}</span>
            <span className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${r.ok ? "bg-emerald-600" : "bg-red-600"}`}
                aria-hidden
              />
              <span className={tekstZacht}>
                <span className="sr-only">{r.ok ? "In orde: " : "Probleem: "}</span>
                {r.waarde}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
