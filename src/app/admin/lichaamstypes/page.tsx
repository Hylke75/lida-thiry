/* eslint-disable @next/next/no-img-element -- tijdelijke (signed) URLs uit de beeldbank */
import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { haalAdviesInhoud, haalFfitToewijzing, haalLichaamstypes, haalSilhouetten } from "@/lib/lichaamstypes";
import { FFIT_TYPES, ontleedTypeSleutel } from "@/lib/lichaamstype-regels";
import { leesInstelling } from "@/lib/instellingen";
import { EXTRA_FIGUURTYPES_SLEUTEL, extraFiguurtypesAan, extraTypeFouten } from "@/lib/extra-figuurtypes";
import { EXTRA_FIGUURTYPES, VERFIJNING_GRENZEN } from "@/rekenkern/config/verfijning";
import { Lichaam } from "@/components/Lichaam";
import { AdminNav, Melding } from "../AdminNav";
import { ExtraFiguurtypesFormulier, ToewijzingFormulier } from "./Formulieren";
import { badge, kaart, kaartVlak, knop, toon } from "@/components/admin/stijl";
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
  const [types, silhouetten, toewijzing, adviesRes, orderRes, extraSchakelaar] = await Promise.all([
    haalLichaamstypes(),
    haalSilhouetten(false),
    haalFfitToewijzing(),
    supabase.from("adviestypes").select("letter"),
    supabase.from("orders").select("toegekend_type").not("toegekend_type", "is", null),
    leesInstelling(EXTRA_FIGUURTYPES_SLEUTEL),
  ]);
  // Hand-outs met inhoud per type (voor de badge en de extra types I en O).
  const adviesInhoud = await haalAdviesInhoud(types.map((t) => t.code));
  const metInhoudPer = new Map<string, number>();
  for (const r of adviesInhoud) {
    const code = ontleedTypeSleutel(r.sleutel)?.code;
    if (code && r.secties > 0) metInhoudPer.set(code, (metInhoudPer.get(code) ?? 0) + 1);
  }
  const extraAan = extraFiguurtypesAan(extraSchakelaar);
  const extraOntbreekt = EXTRA_FIGUURTYPES.map((code) => ({
    code,
    naam: types.find((t) => t.code === code)?.naam ?? code,
    fouten: extraTypeFouten(code, types, adviesInhoud),
  }));
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
                    {!t.actief &&
                      (metInhoudPer.get(t.code) ? (
                        <span className={`${badge} ${toon.grijs} ml-2`}>niet actief</span>
                      ) : (
                        <span className={`${badge} ${toon.amber} ml-2`}>Inactief — nog geen advies</span>
                      ))}
                  </p>
                  <h2 className="font-serif text-xl leading-tight">{t.naam}</h2>
                  {t.alias && <p className="text-xs text-foreground/70">ook wel {t.alias}</p>}
                  <p className="line-clamp-2 text-sm text-black/65 dark:text-white/65">{t.korte_omschrijving}</p>
                  <p className="mt-auto text-xs text-foreground/70">
                    {adviesPer.get(t.code) ?? 0} hand-outs ({metInhoudPer.get(t.code) ?? 0} met inhoud) ·{" "}
                    {ordersPer.get(t.code) ?? 0} bestellingen
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

        <div className="mt-2 flex flex-col gap-3 border-t border-black/10 pt-4 dark:border-white/15">
          <h3 className="font-semibold">Extra figuurtypes I en O (voorlopig)</h3>
          <p className="text-sm text-foreground/70">
            Je oude website kende zeven figuurtypes: naast X, A, V, H en 8 ook het I-silhouet en het O-silhouet (de Appel).
            De berekening kent die twee nog niet als eigen uitkomst. Met deze schakelaar zet je een extra stap aan ná de
            koppeling hierboven. De grenzen zijn voorlopig en door jou te controleren:
          </p>
          <ul className="list-disc pl-5 text-sm text-foreground/70">
            <li>
              <strong>O-silhouet</strong>: de uitkomst is Rechthoek of Omgekeerde driehoek, de taille is minstens{" "}
              {Math.round(VERFIJNING_GRENZEN.oMinTailleHeupRatio * 100)}% van de heupomvang én de borst is groter dan de heup
              (hoge balans).
            </li>
            <li>
              <strong>I-silhouet</strong>: de uitkomst is H (Rechthoek) en de klant vulde een bandmaat van{" "}
              {VERFIJNING_GRENZEN.iMaxBandmaat} of kleiner in (elke cup). Bij 75 of groter blijft het H.
            </li>
            <li>Past O, dan gaat O voor. Bij &ldquo;geen type&rdquo; bepaalt het gekozen silhouet, zoals nu.</li>
          </ul>
          <p className="text-sm text-foreground/70">
            Staat de schakelaar aan, dan vraagt de stap &ldquo;Over jou&rdquo; in de test om de bandmaat van de bh (niet
            verplicht). Het label en de uitleg van dat veld pas je aan onder Teksten → Test → Stap: Over jou.
          </p>
          <ExtraFiguurtypesFormulier aan={extraAan} ontbreekt={extraOntbreekt} />
        </div>
      </section>
    </main>
  );
}
