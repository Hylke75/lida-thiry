import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { BEELD_KOLOMMEN, beeldUrls, downloadUrl, gebruikVan, type Beeld } from "@/lib/beeldbank";
import { IDEAAL_FORMAAT, STANDAARD_EISEN, isTeKlein, verhoudingLabel } from "@/lib/beeldbank-regels";
import { afmetingTekst, gebruikZin, groepeerGebruik } from "@/lib/beeldbank-beheer";
import { AdminNav, Melding } from "../../AdminNav";
import { BeeldUpload } from "../BeeldUpload";
import { StatusBadge, TeKleinBadge } from "../badges";
import { zetTerug } from "../acties";
import { GegevensFormulier } from "./GegevensFormulier";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { VerwijderKnop } from "./VerwijderKnop";

export const dynamic = "force-dynamic";
// Afmetingen bepalen en uploads verwerken (sharp) kan even duren.
export const maxDuration = 120;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const FOUTEN: Record<string, string> = {
  terugzetten: "De vorige versie kon niet worden teruggezet.",
  "in-gebruik": "Dit beeld wordt nog gebruikt en kan daarom niet worden verwijderd.",
  verwijderen: "Verwijderen is niet gelukt. Probeer het opnieuw.",
};

const kaart = "flex flex-col gap-4 rounded-2xl border border-black/10 bg-kaart p-5 dark:border-white/15";

export default async function BeeldPagina({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ nieuw?: string; teruggezet?: string; fout?: string }>;
}) {
  await vereisBeheerder("advies");
  const { id } = await params;
  const { nieuw, teruggezet, fout } = await searchParams;
  if (!UUID.test(id)) notFound();

  const { data } = await adminClient().from("beelden").select(BEELD_KOLOMMEN).eq("id", id).maybeSingle();
  const beeld = data as Beeld | null;
  if (!beeld) notFound();

  const downloadPad = beeld.origineel_pad ?? beeld.pad;
  const extensie = downloadPad.split(".").pop() ?? "jpg";
  const [urls, download, gebruik] = await Promise.all([
    beeldUrls([beeld.pad, beeld.vorige_pad ?? ""]),
    downloadUrl(downloadPad, `${beeld.naam ?? beeld.code}.${extensie}`),
    gebruikVan(beeld.id),
  ]);
  const groepen = groepeerGebruik(gebruik);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/beeldbank" />

      <div className="flex flex-col gap-1">
        <Link href="/admin/beeldbank" className="w-fit text-sm text-black/60 underline underline-offset-4 dark:text-white/60">
          ← Terug naar de beeldbank
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-semibold tracking-tight">{beeld.code}</h1>
          <StatusBadge status={beeld.status} />
          {isTeKlein(beeld) && <TeKleinBadge />}
        </div>
        <p className={`break-all text-sm ${beeld.naam ? "" : "italic text-black/50 dark:text-white/50"}`}>
          {beeld.naam ?? "(nog geen naam)"}
        </p>
      </div>

      {nieuw && (
        <Melding soort="ok">
          Het nieuwe beeld is toegevoegd als {beeld.code}. Geef het hieronder een naam en vul de gegevens aan.
        </Melding>
      )}
      {teruggezet && <Melding soort="ok">De vorige versie is teruggezet.</Melding>}
      {fout && FOUTEN[fout] && <Melding soort="fout">{FOUTEN[fout]}</Melding>}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className={kaart}>
          <div className="flex min-h-64 items-center justify-center rounded-xl bg-white p-4">
            {urls[beeld.pad] ? (
              // eslint-disable-next-line @next/next/no-img-element -- tijdelijke signed URL
              <img src={urls[beeld.pad]} alt={beeld.naam ?? beeld.code} className="max-h-[28rem] max-w-full object-contain" />
            ) : (
              <span className="text-sm text-black/40">Geen voorbeeld beschikbaar</span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="flex flex-wrap items-center gap-2">
              Huidig bestand: <strong>{afmetingTekst(beeld.breedte, beeld.hoogte)}</strong>
              {isTeKlein(beeld) && <TeKleinBadge />}
            </span>
            {download && (
              <a href={download} className="text-accent underline underline-offset-4">
                Origineel downloaden
              </a>
            )}
          </div>
          {isTeKlein(beeld) && (
            <p className="text-sm text-red-700 dark:text-red-400">
              Dit beeld is kleiner dan het minimum en kan in de PDF onscherp worden. Vervang het door een grotere
              versie.
            </p>
          )}
        </section>

        <section className={kaart}>
          <h2 className="text-lg font-semibold">Beeld vervangen</h2>
          <div className="rounded-xl bg-accent-zacht p-4 text-sm leading-relaxed">
            <p className="mb-2 font-medium">Zo lever je een beeld aan</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                Verhouding: <strong>{verhoudingLabel(STANDAARD_EISEN.verhouding_b, STANDAARD_EISEN.verhouding_h)}</strong>{" "}
                — de standaard voor alle beelden, zodat ze in de PDF even groot in een raster staan
              </li>
              <li>
                Ideaal formaat: <strong>{IDEAAL_FORMAAT.breedte} × {IDEAAL_FORMAAT.hoogte} px</strong>; minimaal{" "}
                {STANDAARD_EISEN.min_breedte} × {STANDAARD_EISEN.min_hoogte} px
              </li>
              <li>Niet precies 2:3? Dan vullen we het beeld zonder bijsnijden aan met wit</li>
              <li>Bestandstype: JPG, PNG of WebP, maximaal 15 MB</li>
              <li>Tip: teken op een wit of transparant canvas, met wat ruimte rondom</li>
            </ul>
          </div>
          <p className="text-sm text-black/60 dark:text-white/60">
            We controleren het beeld eerst. Is het te klein, dan zie je meteen waarom en blijft het huidige beeld staan.
          </p>
          <BeeldUpload beeldId={beeld.id} label="Kies een nieuw bestand" />

          {beeld.vorige_pad && (
            <form action={zetTerug} className="flex flex-col gap-2 border-t border-black/10 pt-4 dark:border-white/15">
              <input type="hidden" name="id" value={beeld.id} />
              <div className="flex items-center gap-3">
                {urls[beeld.vorige_pad] && (
                  // eslint-disable-next-line @next/next/no-img-element -- tijdelijke signed URL
                  <img src={urls[beeld.vorige_pad]} alt="Vorige versie" className="h-16 w-16 rounded bg-white object-contain" />
                )}
                <p className="text-sm text-black/60 dark:text-white/60">
                  Niet tevreden met de nieuwe versie? Zet de vorige versie terug.
                </p>
              </div>
              <button className="w-fit rounded-full border border-black/20 px-5 py-2 text-sm hover:border-accent dark:border-white/25">
                Vorige versie terugzetten
              </button>
            </form>
          )}
        </section>
      </div>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Gegevens</h2>
        <GegevensFormulier
          beeld={beeld}
          figuren={(await haalLichaamstypes()).map((t) => ({ code: t.code, naam: t.naam }))}
        />
      </section>

      <section className={kaart}>
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">Waar wordt dit beeld gebruikt?</h2>
          <p className="text-sm text-black/60 dark:text-white/60">
            {gebruik.length === 0
              ? "Dit beeld wordt (nog) in geen enkel adviestype gebruikt."
              : `Dit beeld staat ${gebruikZin(gebruik.length, groepen.length)}. Vervang je het beeld, dan krijgen ze allemaal automatisch de nieuwe versie.`}
          </p>
        </div>
        {groepen.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {groepen.map((g) => (
              <li key={g.type_sleutel} className="rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15">
                <span className="font-medium">
                  {g.type_sleutel} · {g.type_titel}
                </span>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {g.secties.map((s) => (
                    <li key={s.sectie_id}>
                      <Link
                        href={`/admin/types/${encodeURIComponent(s.type_sleutel)}#sectie-${s.sectie_id}`}
                        className="text-accent underline underline-offset-4"
                      >
                        {s.kop}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Beeld verwijderen</h2>
        {gebruik.length === 0 ? (
          <>
            <p className="text-sm text-black/60 dark:text-white/60">
              Dit beeld wordt nergens gebruikt en kan dus veilig worden verwijderd. Dit kan niet ongedaan worden
              gemaakt.
            </p>
            <VerwijderKnop id={beeld.id} code={beeld.code} />
          </>
        ) : (
          <p className="text-sm text-black/60 dark:text-white/60">
            Verwijderen kan alleen als een beeld nergens meer gebruikt wordt. Haal het eerst weg uit de adviestypes
            hierboven.
          </p>
        )}
      </section>
    </main>
  );
}
