import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { datumTijd } from "@/lib/nieuwsbrief/contactregels";
import { STATUS_LABEL as NB_STATUS_LABEL, type ContactStatus } from "@/lib/nieuwsbrief/doelgroep";
import { ontleedSleutel } from "@/lib/adviestypes-beheer";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { formatteerBedrag } from "@/lib/prijs";
import { RELATIE_BRON_LABEL } from "@/lib/relaties/regels";
import { alleRelatieTags, geschiedenis, relatieOpId } from "@/lib/relaties/beheer";
import { bouwTijdlijn, type TijdlijnSoort } from "@/lib/relaties/tijdlijn";
import { weergaveNaam } from "@/lib/relaties/zoeken";
import { BETAALDE_STATUSSEN, statusLabel } from "../../status";
import { AdminNav, Melding } from "../../AdminNav";
import { BevestigKnop } from "../../nieuwsbrief/contacten/Invoer";
import { vergeetActie, voegNotitieToeActie } from "../acties";
import { KopieerKnop } from "../Knoppen";
import { RelatieFormulier } from "../RelatieFormulier";
import { BERICHT_STATUS_LABEL, Badges, datum, gevaarKnop, heelZacht, hoofdknop, invoer, kaart, kleineKnop, PAD, zacht } from "../ui";

export const dynamic = "force-dynamic";

const SOORT_STIJL: Record<TijdlijnSoort, { label: string; kleur: string }> = {
  relatie: { label: "Adresboek", kleur: "bg-black/30 dark:bg-white/40" },
  bestelling: { label: "Bestelling", kleur: "bg-emerald-500" },
  nieuwsbrief: { label: "Nieuwsbrief", kleur: "bg-sky-500" },
  mail: { label: "Nieuwsbrief", kleur: "bg-sky-300" },
  bericht: { label: "Bericht", kleur: "bg-amber-500" },
};

export default async function RelatiePagina({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; fout?: string }>;
}) {
  await vereisBeheerder();
  const [{ id }, { ok, fout }] = await Promise.all([params, searchParams]);
  if (!UUID_PATROON.test(id)) notFound();
  const r = await relatieOpId(id);
  if (!r) notFound();

  const [g, tags, lichaamstypes] = await Promise.all([
    geschiedenis(r),
    alleRelatieTags().catch(() => [] as string[]),
    haalLichaamstypes().catch(() => []),
  ]);
  const typeNaam = new Map(lichaamstypes.map((t) => [t.code, t.naam]));
  const figuurtype = (sleutel: string) => {
    const o = ontleedSleutel(sleutel);
    const naam = o ? typeNaam.get(o.letter) : undefined;
    return naam ? `${sleutel} (${naam})` : sleutel;
  };

  const tijdlijn = bouwTijdlijn({
    relatie: { aangemaakt_op: r.aangemaakt_op, bijgewerkt_op: r.bijgewerkt_op, bronLabel: RELATIE_BRON_LABEL[r.bron] ?? r.bron },
    ...g,
    labels: {
      orderStatus: statusLabel,
      bedrag: (cent, valuta) => formatteerBedrag(cent, valuta ?? "EUR"),
      figuurtype,
      nieuwsbriefStatus: (s) => NB_STATUS_LABEL[s as ContactStatus] ?? s,
      berichtStatus: (s) => BERICHT_STATUS_LABEL[s] ?? s,
    },
  });

  const naam = weergaveNaam(r);
  const k = {
    klant: g.bestellingen.some((o) => BETAALDE_STATUSSEN.includes(o.status)),
    nieuwsbrief: g.nieuwsbrief?.status === "aangemeld",
    bericht: g.berichten.some((b) => b.status !== "spam"),
  };
  const adres = [r.straat, [r.postcode, r.plaats].filter(Boolean).join("  "), r.land && r.land !== "Nederland" ? r.land : null]
    .filter(Boolean)
    .join("\n");
  const adresMetNaam = [naam, r.bedrijf && r.bedrijf !== naam ? r.bedrijf : null, adres].filter(Boolean).join("\n");
  const tel = r.telefoon?.replace(/[^\d+]/g, "");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-8">
      <AdminNav actief="/admin/adresboek" />
      <header className="flex flex-col gap-2">
        <Link href={PAD} className={`text-sm underline underline-offset-4 ${heelZacht}`}>
          ← Adresboek
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="min-w-0 break-words text-2xl font-semibold tracking-tight">{naam}</h1>
          <Badges k={k} />
        </div>
        <p className={`text-sm ${zacht}`}>
          {RELATIE_BRON_LABEL[r.bron]} · in het adresboek sinds {datum(r.aangemaakt_op)}
          {r.tags.length > 0 && (
            <>
              {" · "}
              {r.tags.map((t) => (
                <Link key={t} href={`${PAD}?tag=${encodeURIComponent(t)}`} className="mr-1 rounded-full bg-accent-zacht px-2 py-0.5 text-xs text-accent">
                  {t}
                </Link>
              ))}
            </>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {r.email && (
            <a href={`mailto:${r.email}`} className={kleineKnop}>
              Mail sturen
            </a>
          )}
          {tel && (
            <a href={`tel:${tel}`} className={kleineKnop}>
              Bel {r.telefoon}
            </a>
          )}
          {adres && (
            <KopieerKnop tekst={adresMetNaam} className={kleineKnop}>
              Adres kopiëren
            </KopieerKnop>
          )}
          <Link href={`${PAD}/dubbel?a=${r.id}`} className={kleineKnop}>
            Samenvoegen met…
          </Link>
        </div>
      </header>

      {ok && <Melding soort="ok">{ok}</Melding>}
      {fout && <Melding soort="fout">{fout}</Melding>}

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Gegevens</h2>
        {/* key: na opslaan of een nieuwe notitie opnieuw beginnen met de actuele waarden. */}
        <RelatieFormulier key={r.bijgewerkt_op} relatie={r} tags={tags} />
      </section>

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Notitie toevoegen</h2>
        <form action={voegNotitieToeActie} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={r.id} />
          <textarea
            name="notitie"
            rows={3}
            required
            maxLength={5000}
            placeholder="Bijvoorbeeld: belde over een kleuradvies, terugbellen in november."
            aria-label="Nieuwe notitie"
            className={invoer}
          />
          <p className={`text-xs ${heelZacht}`}>Komt bovenaan de notities, met de datum en je naam.</p>
          <div>
            <button className={hoofdknop}>Notitie toevoegen</button>
          </div>
        </form>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className={`text-sm font-semibold uppercase tracking-wide ${heelZacht}`}>Geschiedenis</h2>
        {!r.email && (
          <p className={`text-sm ${zacht}`}>
            Deze relatie heeft geen e-mailadres, dus bestellingen en de nieuwsbrief kunnen niet gekoppeld worden.
          </p>
        )}
        <ol className="flex flex-col">
          {tijdlijn.map((item, i) => (
            <li key={item.sleutel} className="relative flex gap-3 pb-4 pl-1">
              {i < tijdlijn.length - 1 && <span aria-hidden className="absolute left-[0.6rem] top-4 bottom-0 w-px bg-black/10 dark:bg-white/15" />}
              <span aria-hidden className={`relative mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${SOORT_STIJL[item.soort].kleur}`} />
              <div className="flex min-w-0 flex-col gap-0.5 text-sm">
                <span className={`text-xs ${heelZacht}`}>
                  {datumTijd(item.op)} · {SOORT_STIJL[item.soort].label}
                </span>
                {item.link ? (
                  <Link href={item.link} className="break-words font-medium hover:text-accent hover:underline">
                    {item.titel}
                  </Link>
                ) : (
                  <span className="break-words font-medium">{item.titel}</span>
                )}
                {item.details.length > 0 && <span className={zacht}>{item.details.join(" · ")}</span>}
              </div>
            </li>
          ))}
        </ol>
        {r.email && g.bestellingen.length === 0 && !g.nieuwsbrief && g.berichten.length === 0 && (
          <p className={`text-sm ${heelZacht}`}>Nog geen bestellingen, nieuwsbrief of berichten bij dit e-mailadres.</p>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl border border-black/10 p-5 dark:border-white/15">
        <h2 className="text-lg font-semibold">Privacy (AVG)</h2>
        <p className={`text-sm ${zacht}`}>
          Bij een inzageverzoek download je alles wat over deze persoon is opgeslagen: de gegevens in het adresboek,
          bestellingen en testresultaten, de nieuwsbrief (met ontvangen mails) en contactberichten.
        </p>
        <div>
          <a href={`${PAD}/${r.id}/gegevens`} className={kleineKnop}>
            Gegevens downloaden (JSON)
          </a>
        </div>
        <form action={vergeetActie} className="flex flex-col gap-2 border-t border-black/10 pt-3 text-sm dark:border-white/15">
          <input type="hidden" name="id" value={r.id} />
          <p className={zacht}>
            Bij een verzoek om vergeten te worden verwijder je de relatie uit het adresboek. Kies wat er nog meer weg moet.{" "}
            <strong>Bestellingen en facturen blijven bewaard</strong>: daarvoor geldt een wettelijke bewaarplicht van
            zeven jaar (Belastingdienst).
          </p>
          {g.nieuwsbrief && (
            <label className="flex items-start gap-2">
              <input type="checkbox" name="nieuwsbrief" defaultChecked className="mt-1 accent-accent" />
              <span>Ook het nieuwsbriefcontact verwijderen (het adres verdwijnt ook uit de verzendgeschiedenis)</span>
            </label>
          )}
          {g.berichten.length > 0 && (
            <label className="flex items-start gap-2">
              <input type="checkbox" name="berichten" defaultChecked className="mt-1 accent-accent" />
              <span>
                Ook {g.berichten.length === 1 ? "het contactbericht" : `de ${g.berichten.length} contactberichten`} (met
                antwoorden) verwijderen
              </span>
            </label>
          )}
          <div>
            <BevestigKnop bevestiging={`${naam} definitief vergeten? Dit kan niet ongedaan worden gemaakt.`} className={`${kleineKnop} ${gevaarKnop}`}>
              Vergeten (verwijderen)
            </BevestigKnop>
          </div>
        </form>
      </section>
    </main>
  );
}
