import type { Metadata } from "next";
import { Opmaak } from "@/components/Opmaak";
import { leesSectie } from "@/lib/inhoud/lees";
import { NIEUWSBRIEF_AFMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { contactViaToken } from "@/lib/nieuwsbrief/beheer";
import { TOKEN_PATROON, UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { Kader } from "../../Kader";
import { afmelden, opnieuwAanmelden } from "./acties";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Afmelden voor de nieuwsbrief",
  robots: { index: false, follow: false },
};

const hoofdknop =
  "rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90";
const tweedeKnop = "rounded-full border border-accent/40 px-6 py-2.5 text-sm font-medium text-accent hover:bg-accent-zacht";

// Afmelden gebeurt pas na een klik op de knop (POST): virusscanners en
// linkvoorbeelden openen links in mails automatisch, en mogen niemand afmelden.
// Voor mailprogramma's met een afmeldknop is er /api/nb/afmelden (RFC 8058).
export default async function AfmeldPagina({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ v?: string; stap?: string }>;
}) {
  const [{ token }, { v, stap }, t] = await Promise.all([params, searchParams, leesSectie(NIEUWSBRIEF_AFMELDEN)]);
  const contact = TOKEN_PATROON.test(token) ? await contactViaToken(token).catch(() => null) : null;
  if (!contact) return <Kader titel={t.ongeldig_titel} tekst={t.ongeldig_tekst} />;

  const fout = stap === "fout" && (
    <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
      Er ging iets mis. Probeer het nog eens.
    </p>
  );

  if (contact.status === "aangemeld" && stap === "aangemeld") {
    return <Kader titel={t.welkom_terug_titel} tekst={t.welkom_terug_tekst} />;
  }

  if (contact.status === "aangemeld" || contact.status === "onbevestigd") {
    return (
      <Kader titel={t.vraag_titel} tekst={t.vraag_tekst}>
        {fout}
        <form action={afmelden}>
          <input type="hidden" name="token" value={token} />
          {v && UUID_PATROON.test(v) && <input type="hidden" name="v" value={v} />}
          <button className={hoofdknop}>{t.knop}</button>
        </form>
      </Kader>
    );
  }

  // Afgemeld (of het adres is onbestelbaar of als spam gemeld): niets meer te doen.
  return (
    <Kader titel={t.afgemeld_titel} tekst={t.afgemeld_tekst}>
      {fout}
      {contact.status === "afgemeld" && (
        <form action={opnieuwAanmelden} className="mt-6 flex flex-col items-center gap-3 border-t border-foreground/10 pt-6">
          <input type="hidden" name="token" value={token} />
          <p className="text-sm text-foreground/70">{t.opnieuw_tekst}</p>
          <button className={tweedeKnop}>{t.opnieuw_knop}</button>
          <div className="text-xs text-foreground/50 [&_a]:text-accent [&_a]:underline">
            <Opmaak tekst={t.opnieuw_toestemming} />
          </div>
        </form>
      )}
    </Kader>
  );
}
