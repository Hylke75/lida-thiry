import { createClient } from "@/lib/supabase/server";
import { geverifieerdeFactoren } from "@/lib/mfa-regels";
import { CodeFormulier } from "./CodeFormulier";
import { InlogFormulier } from "./InlogFormulier";

export const dynamic = "force-dynamic";

/** Is er al een sessie die alleen nog de code uit de authenticator-app mist? */
async function wachtOpCode(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || geverifieerdeFactoren(user.factors).length === 0) return null;
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    return data?.currentLevel === "aal2" ? null : (user.email ?? "");
  } catch {
    return null;
  }
}

export default async function InloggenPage({
  searchParams,
}: {
  searchParams: Promise<{ geen_toegang?: string; stap?: string }>;
}) {
  const { geen_toegang } = await searchParams;
  const codeVoor = await wachtOpCode();
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Beheer — inloggen</h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          {codeVoor !== null
            ? "Vul de code van 6 cijfers uit je authenticator-app in."
            : "Log in met je e-mailadres en wachtwoord."}
        </p>
      </div>
      {geen_toegang && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          Dit account heeft geen toegang tot het beheer.
        </p>
      )}
      {codeVoor !== null ? (
        <>
          {codeVoor && (
            <p className="text-sm text-black/60 dark:text-white/60">
              Ingelogd als <strong>{codeVoor}</strong>.
            </p>
          )}
          <CodeFormulier />
          <form action="/auth/uitloggen" method="post">
            <button className="text-sm text-black/50 underline underline-offset-4 hover:text-black/80 dark:text-white/50 dark:hover:text-white/80">
              Uitloggen of met een ander account inloggen
            </button>
          </form>
          <p className="text-xs text-black/50 dark:text-white/50">
            Telefoon kwijt? Vraag een eigenaar om je tweestapsverificatie te resetten (Instellingen → Beheerders).
          </p>
        </>
      ) : (
        <InlogFormulier />
      )}
    </main>
  );
}
