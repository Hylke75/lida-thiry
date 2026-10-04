import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { beeldUrls } from "@/lib/beeldbank";
import { haalFfitToewijzing, haalLichaamstypes } from "@/lib/lichaamstypes";
import { CATEGORIEEN, FFIT_TYPES, typeSleutel } from "@/lib/lichaamstype-regels";
import { AdminNav, Melding } from "../../AdminNav";
import { LichaamstypeFormulier } from "../LichaamstypeFormulier";
import { VerwijderFormulier } from "../Formulieren";
import type { FotoKeuze } from "../acties";

export const dynamic = "force-dynamic";

const kaart = "rounded-2xl border border-black/10 bg-kaart p-5 dark:border-white/15";

export default async function LichaamstypeBewerken({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ nieuw?: string }>;
}) {
  await vereisBeheerder("advies");
  const code = decodeURIComponent((await params).code);
  const { nieuw } = await searchParams;
  const type = (await haalLichaamstypes()).find((t) => t.code === code);
  if (!type) notFound();

  const supabase = adminClient();
  let foto: FotoKeuze | null = null;
  if (type.beeld_id) {
    const { data: b } = await supabase
      .from("beelden")
      .select("id, code, naam, omschrijving, pad, thumb_pad")
      .eq("id", type.beeld_id)
      .maybeSingle();
    if (b) {
      const pad = (b.thumb_pad ?? b.pad) as string;
      foto = { id: b.id, code: b.code, naam: b.naam, omschrijving: b.omschrijving, url: (await beeldUrls([pad]))[pad] ?? null };
    }
  }

  const sleutels = CATEGORIEEN.map((c) => typeSleutel(c, code));
  const [{ data: adviestypes }, { count: orders }, toewijzing] = await Promise.all([
    supabase.from("adviestypes").select("sleutel, categorie, titel").eq("letter", code).order("categorie"),
    supabase.from("orders").select("id", { count: "exact", head: true }).in("toegekend_type", sleutels),
    haalFfitToewijzing(),
  ]);
  const uitkomsten = FFIT_TYPES.filter((f) => toewijzing[f] === code);
  const kanVerwijderen = !orders && uitkomsten.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/lichaamstypes" />
      <Link href="/admin/lichaamstypes" className="text-sm text-black/60 underline-offset-4 hover:underline dark:text-white/60">
        ← Alle lichaamstypes
      </Link>
      <div>
        <p className="text-sm text-black/50 dark:text-white/50">Lichaamstype {type.code}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{type.naam}</h1>
      </div>

      {nieuw && (
        <Melding soort="ok">
          Het lichaamstype is aangemaakt, met 12 hand-outs
          {nieuw.startsWith("overgenomen-") ? ` (${nieuw.split("-")[1]} velden overgenomen als startpunt)` : " (nog leeg)"}.
          Koppel het hieronder of op de overzichtspagina aan een uitkomst van de berekening.
        </Melding>
      )}

      <LichaamstypeFormulier type={type} foto={foto} />

      <section className={`${kaart} flex flex-col gap-3`}>
        <h2 className="text-lg font-semibold">Hand-outs van dit type</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Per categorie lengte/gewicht één hand-out. Klik om de velden, teksten en beelden te bewerken.
        </p>
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {(adviestypes ?? []).map((a) => (
            <li key={a.sleutel}>
              <Link href={`/admin/types/${encodeURIComponent(a.sleutel)}`} className="text-accent underline-offset-4 hover:underline">
                {a.sleutel}
              </Link>{" "}
              <span className="text-black/60 dark:text-white/60">· {a.titel}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-black/60 dark:text-white/60">
          Uitkomsten van de berekening die bij dit type horen:{" "}
          <strong>{uitkomsten.length ? uitkomsten.join(", ") : "nog geen"}</strong>.{" "}
          <Link href="/admin/lichaamstypes#koppeling" className="text-accent underline underline-offset-2">
            Koppeling aanpassen
          </Link>
        </p>
      </section>

      <section className={`${kaart} flex flex-col gap-3 border-red-200 dark:border-red-900`}>
        <h2 className="text-lg font-semibold">Archiveren of verwijderen</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Wil je dit type niet meer gebruiken, zet het dan hierboven op <strong>niet actief</strong>: het verdwijnt uit de
          test en van de website, maar bestaande uitslagen en PDF&rsquo;s blijven werken.
        </p>
        {kanVerwijderen ? (
          <>
            <p className="text-sm text-black/60 dark:text-white/60">
              Verwijderen haalt het type en zijn 12 hand-outs (teksten en beeldkoppelingen) definitief weg. De beelden zelf
              blijven in de beeldbank.
            </p>
            <VerwijderFormulier code={type.code} naam={type.naam} />
          </>
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">
            Verwijderen kan niet:{" "}
            {orders ? `er ${orders === 1 ? "hoort 1 bestelling" : `horen ${orders} bestellingen`} bij dit type` : ""}
            {orders && uitkomsten.length ? " en " : ""}
            {uitkomsten.length ? "de berekening gebruikt dit type nog als uitkomst" : ""}.
          </p>
        )}
      </section>
    </main>
  );
}
