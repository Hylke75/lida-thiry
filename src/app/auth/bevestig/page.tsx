import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { veiligVervolg } from "@/lib/beheerder-regels";

export const dynamic = "force-dynamic";

const SOORTEN = ["invite", "recovery"] as const;
type Soort = (typeof SOORTEN)[number];

function isSoort(v: unknown): v is Soort {
  return SOORTEN.includes(v as Soort);
}

// Wisselt de eenmalige code uit de uitnodigings- of inlogmail in voor een sessie.
// Bewust pas na een klik op de knop (POST): virusscanners in e-mailprogramma's
// openen links soms vooraf, en zouden de eenmalige code anders opgebruiken.
async function bevestig(formData: FormData) {
  "use server";
  const tokenHash = String(formData.get("token_hash") ?? "");
  const type = formData.get("type");
  const next = veiligVervolg(formData.get("next"));
  if (!tokenHash || !isSoort(type)) redirect("/auth/bevestig?fout=1");
  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) redirect("/auth/bevestig?fout=1");
  redirect(next);
}

export default async function BevestigPagina({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; next?: string; fout?: string }>;
}) {
  const { token_hash, type, next, fout } = await searchParams;
  const geldig = Boolean(token_hash) && isSoort(type);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight">Beheer</h1>
      {fout || !geldig ? (
        <>
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            Deze link is niet (meer) geldig. Een link werkt één keer en is beperkt geldig. Vraag een andere beheerder om
            een nieuwe link.
          </p>
          <Link href="/admin/inloggen" className="text-sm underline underline-offset-4">
            Naar inloggen
          </Link>
        </>
      ) : (
        <form action={bevestig} className="flex flex-col gap-4">
          <p className="text-sm text-black/60 dark:text-white/60">
            {type === "invite"
              ? "Welkom! Klik op de knop om je uitnodiging te accepteren. Daarna kies je een eigen wachtwoord."
              : "Klik op de knop om in te loggen. Daarna kun je een nieuw wachtwoord kiezen."}
          </p>
          <input type="hidden" name="token_hash" value={token_hash} />
          <input type="hidden" name="type" value={type} />
          <input type="hidden" name="next" value={veiligVervolg(next)} />
          <button className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90">
            {type === "invite" ? "Uitnodiging accepteren" : "Inloggen"}
          </button>
        </form>
      )}
    </main>
  );
}
