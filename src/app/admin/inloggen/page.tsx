import { createClient } from "@/lib/supabase/server";
import { geverifieerdeFactoren } from "@/lib/mfa-regels";
import { AdminKop } from "@/components/admin/AdminKop";
import { tekstZacht } from "@/components/admin/stijl";
import { Melding } from "../Melding";
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
      <AdminKop
        titel="Beheer — inloggen"
        beschrijving={
        codeVoor !== null
        ? "Vul de code van 6 cijfers uit je authenticator-app in."
        : "Log in met je e-mailadres en wachtwoord."
        }
      />
      {geen_toegang && <Melding soort="fout">Dit account heeft geen toegang tot het beheer.</Melding>}
      {codeVoor !== null ? (
        <>
          {codeVoor && (
            <p className={`text-sm ${tekstZacht}`}>
              Ingelogd als <strong>{codeVoor}</strong>.
            </p>
          )}
          <CodeFormulier />
          <form action="/auth/uitloggen" method="post">
            <button className={`text-sm ${tekstZacht} underline underline-offset-4 hover:text-foreground`}>
              Uitloggen of met een ander account inloggen
            </button>
          </form>
          <p className={`text-xs ${tekstZacht}`}>
            Telefoon kwijt? Vraag een eigenaar om je tweestapsverificatie te resetten (Instellingen → Beheerders).
          </p>
        </>
      ) : (
        <InlogFormulier />
      )}
    </main>
  );
}
