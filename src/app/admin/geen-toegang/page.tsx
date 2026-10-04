import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { isRecht, RECHTEN, ROL_LABEL, ROL_UITLEG, startPagina } from "@/lib/rollen";
import { AdminNav } from "../AdminNav";

export const dynamic = "force-dynamic";

/** Vriendelijke melding als je rol een pagina of actie niet toestaat. */
export default async function GeenToegangPagina({ searchParams }: { searchParams: Promise<{ recht?: string }> }) {
  const ik = await vereisBeheerder();
  const { recht } = await searchParams;
  const onderdeel = isRecht(recht) ? RECHTEN[recht].label : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav />
      <section className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-5 dark:border-white/15">
        <h1 className="text-2xl font-semibold tracking-tight">Geen toegang</h1>
        <p className="text-sm text-black/70 dark:text-white/70">
          {onderdeel ? (
            <>
              Met jouw rol (<strong>{ROL_LABEL[ik.rol].toLowerCase()}</strong>) kun je dit onderdeel niet gebruiken:{" "}
              <strong>{onderdeel.charAt(0).toLowerCase() + onderdeel.slice(1)}</strong>.
            </>
          ) : (
            <>
              Met jouw rol (<strong>{ROL_LABEL[ik.rol].toLowerCase()}</strong>) kun je deze pagina niet gebruiken.
            </>
          )}
        </p>
        <p className="text-sm text-black/60 dark:text-white/60">{ROL_UITLEG[ik.rol]}</p>
        <p className="text-sm text-black/60 dark:text-white/60">
          Heb je dit wel nodig? Vraag een eigenaar om je rol aan te passen (Instellingen → Beheerders).
        </p>
        <Link
          href={startPagina(ik.rol)}
          className="w-fit rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90"
        >
          Naar het beheer
        </Link>
      </section>
    </main>
  );
}
