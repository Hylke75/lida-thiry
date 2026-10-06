import { TekstLink } from "@/components/site/Basis";
import { KlantKop, KlantPagina } from "@/components/site/KlantPagina";
import { createClient } from "@/lib/supabase/server";
import { vereisBeheerder } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
  // Toont configuratie-informatie: alleen voor beheerders.
  await vereisBeheerder("overzicht");

  const urlSet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const keySet = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  let connected = false;
  let detail = "";

  try {
    const supabase = await createClient();
    // getUser() bereikt de Supabase-auth-server; geen tabellen nodig.
    const { error } = await supabase.auth.getUser();
    // "Auth session missing" is normaal zonder ingelogde gebruiker = verbinding OK.
    connected = !error || error.name === "AuthSessionMissingError";
    detail = error ? error.message : "OK";
  } catch (e) {
    detail = e instanceof Error ? e.message : "Onbekende fout";
  }

  const rows: { label: string; ok: boolean; value: string }[] = [
    { label: "NEXT_PUBLIC_SUPABASE_URL", ok: urlSet, value: urlSet ? "gezet" : "ontbreekt" },
    { label: "NEXT_PUBLIC_SUPABASE_ANON_KEY", ok: keySet, value: keySet ? "gezet" : "ontbreekt" },
    { label: "Supabase-verbinding", ok: connected, value: detail },
  ];

  return (
    <KlantPagina>
      <KlantKop bovenschrift="Beheer" titel="Verbindingsstatus" />
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex flex-col gap-2 rounded-ontwerp-sm border border-line bg-white px-5 py-4 text-[14px] tablet:flex-row tablet:items-center tablet:justify-between tablet:gap-4"
          >
            <span className="font-mono break-all text-ink">{r.label}</span>
            <span className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${r.ok ? "bg-[#3f7a35]" : "bg-[#b42318]"}`}
                aria-hidden
              />
              <span className="text-ink-soft">{r.value}</span>
            </span>
          </li>
        ))}
      </ul>
      <TekstLink href="/" className="mt-6 text-[14px]">
        ← Terug
      </TekstLink>
    </KlantPagina>
  );
}
