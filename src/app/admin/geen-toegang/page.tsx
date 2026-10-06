import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { isRecht, RECHTEN, ROL_LABEL, ROL_UITLEG, startPagina } from "@/lib/rollen";
import { AdminNav } from "../AdminNav";
import { kaart, knop } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

/** Vriendelijke melding als je rol een pagina of actie niet toestaat. */
export default async function GeenToegangPagina({ searchParams }: { searchParams: Promise<{ recht?: string }> }) {
  const ik = await vereisBeheerder();
  const { recht } = await searchParams;
  const onderdeel = isRecht(recht) ? RECHTEN[recht].label : null;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav />
      <section className={kaart}>
        <AdminKop titel="Geen toegang" />
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
        <p className="text-sm text-foreground/70">{ROL_UITLEG[ik.rol]}</p>
        <p className="text-sm text-foreground/70">
          Heb je dit wel nodig? Vraag een eigenaar om je rol aan te passen (Instellingen → Beheerders).
        </p>
        <Link
          href={startPagina(ik.rol)}
          className={`${knop} w-fit`}
        >
          Naar het beheer
        </Link>
      </section>
    </main>
  );
}
