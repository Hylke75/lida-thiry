import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StatusPage() {
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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Verbindingsstatus</h1>
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-center justify-between gap-4 rounded-lg border border-black/10 px-4 py-3 text-sm dark:border-white/15"
          >
            <span className="font-mono text-black/70 dark:text-white/70">
              {r.label}
            </span>
            <span className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  r.ok ? "bg-green-500" : "bg-red-500"
                }`}
                aria-hidden
              />
              <span className="text-black/60 dark:text-white/60">{r.value}</span>
            </span>
          </li>
        ))}
      </ul>
      <Link
        href="/"
        className="text-sm text-black/50 underline underline-offset-4 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80"
      >
        ← Terug
      </Link>
    </main>
  );
}
