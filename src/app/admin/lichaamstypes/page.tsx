/* eslint-disable @next/next/no-img-element -- tijdelijke (signed) URLs uit de beeldbank */
import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { haalFfitToewijzing, haalLichaamstypes, haalSilhouetten } from "@/lib/lichaamstypes";
import { FFIT_TYPES, ontleedTypeSleutel } from "@/lib/lichaamstype-regels";
import { Lichaam } from "@/components/Lichaam";
import { AdminNav, Melding } from "../AdminNav";
import { ToewijzingFormulier } from "./Formulieren";
import { kaart, kaartVlak, knop } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

export default async function LichaamstypesPagina({
  searchParams,
}: {
  searchParams: Promise<{ verwijderd?: string }>;
}) {
  await vereisBeheerder("advies");
  const { verwijderd } = await searchParams;
  const supabase = adminClient();
  const [types, silhouetten, toewijzing, adviesRes, orderRes] = await Promise.all([
    haalLichaamstypes(),
    haalSilhouetten(false),
    haalFfitToewijzing(),
    supabase.from("adviestypes").select("letter"),
    supabase.from("orders").select("toegekend_type").not("toegekend_type", "is", null),
  ]);
  const adviesPer = new Map<string, number>();
  for (const r of adviesRes.data ?? []) adviesPer.set(r.letter, (adviesPer.get(r.letter) ?? 0) + 1);
  const ordersPer = new Map<string, number>();
  for (const r of orderRes.data ?? []) {
    const code = ontleedTypeSleutel(r.toegekend_type ?? "")?.code;
    if (code) ordersPer.set(code, (ordersPer.get(code) ?? 0) + 1);
  }
  const uitkomstenVan = (code: string) => FFIT_TYPES.filter((f) => toewijzing[f] === code);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/lichaamstypes" />

      <AdminKop
        titel="Lichaamstypes"
        beschrijving={
          <>
            De figuurtypes die de test kan uitwijzen. Hier beheer je per type de naam, omschrijving, uitleg, kenmerken,
            tekening en foto. Bij elk lichaamstype horen 12 hand-outs (één per categorie lengte/gewicht), die je onder{" "}
            <Link href="/admin/types" className="text-accent underline underline-offset-2">
              Adviestypes
            </Link>{" "}
            bewerkt.
          </>
        }
        acties={
          <Link href="/admin/lichaamstypes/nieuw" className={knop}>
            + Nieuw lichaamstype
          </Link>
        }
      />

      {verwijderd && <Melding soort="ok">Lichaamstype {verwijderd} is verwijderd, met de bijbehorende hand-outs.</Melding>}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((t) => {
          const s = silhouetten.find((x) => x.letter === t.code);
          const uitkomsten = uitkomstenVan(t.code);
          return (
            <li key={t.code}>
              <Link
                href={`/admin/lichaamstypes/${encodeURIComponent(t.code)}`}
                className={`${kaartVlak} flex h-full gap-4 transition-colors hover:border-accent`}
              >
                <div className="flex h-36 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-zacht text-accent">
                  {s?.beeldUrl ? (
                    <img src={s.beeldUrl} alt={t.naam} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <Lichaam vorm={t.vorm} armen={false} titel={t.naam} className="h-32" />
                  )}
                </div>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="text-xs text-foreground/70">
                    Code {t.code}
                    {!t.actief && (
                      <span className="ml-2 rounded-full bg-black/10 px-2 py-0.5 dark:bg-white/15">niet actief</span>
                    )}
                  </p>
                  <h2 className="font-serif text-xl leading-tight">{t.naam}</h2>
                  {t.alias && <p className="text-xs text-foreground/70">ook wel {t.alias}</p>}
                  <p className="line-clamp-2 text-sm text-black/65 dark:text-white/65">{t.korte_omschrijving}</p>
                  <p className="mt-auto text-xs text-foreground/70">
                    {adviesPer.get(t.code) ?? 0} hand-outs · {ordersPer.get(t.code) ?? 0} bestellingen
                  </p>
                  <p className="text-xs text-foreground/70">
                    {uitkomsten.length
                      ? `Uitkomst berekening: ${uitkomsten.join(", ")}`
                      : "Nog niet gekoppeld aan een uitkomst van de berekening"}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <section id="koppeling" className={`${kaart} scroll-mt-6`}>
        <h2 className="text-lg font-semibold">Koppeling met de berekening</h2>
        <p className="text-sm text-foreground/70">
          De test berekent uit de maten een van zeven figuurtypes (FFIT). Hier bepaal je bij welk lichaamstype elke uitkomst
          hoort. Een nieuw lichaamstype kan de test pas uitwijzen als er minstens één uitkomst aan gekoppeld is. Wijzigingen
          gelden voor nieuwe tests.
        </p>
        <ToewijzingFormulier
          toewijzing={toewijzing}
          types={types.map((t) => ({ code: t.code, naam: t.naam, actief: t.actief }))}
        />
      </section>
    </main>
  );
}
