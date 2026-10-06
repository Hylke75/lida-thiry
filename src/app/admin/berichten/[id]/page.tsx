import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { BERICHT_VELDEN, type ContactAntwoord, type ContactBericht } from "@/lib/contact/berichten";
import { MAX, voornaamVan } from "@/lib/contact/regels";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { AdminNav, Melding } from "../../AdminNav";
import { beantwoord, bewaarNotitie, verwijderBericht, wijzigStatus } from "../acties";
import { BevestigKnop, Tekstvak, VerzendKnop } from "../Knoppen";
import { BerichtStatusLabel } from "../StatusLabel";
import { invoer, kaart, kaartVlak, knop, knopGevaarKlein, knopKlein } from "@/components/admin/stijl";
import { datumTijd } from "@/lib/datum";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

const PAD = "/admin/berichten";

function Gegeven({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-foreground/70 sm:w-32">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

function ActieKnop({ id, actie, children, className = knopKlein }: { id: string; actie: string; children: ReactNode; className?: string }) {
  return (
    <form action={wijzigStatus}>
      <input type="hidden" name="id" value={id} />
      <button name="actie" value={actie} className={className}>
        {children}
      </button>
    </form>
  );
}

export default async function BerichtPagina({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await vereisBeheerder("berichten");
  const { id } = await params;
  if (!UUID_PATROON.test(id)) notFound();
  const zoek = await searchParams;
  const ok = typeof zoek.ok === "string" ? zoek.ok : null;
  const fout = typeof zoek.fout === "string" ? zoek.fout : null;

  const supabase = adminClient();
  const [berichtRes, antwoordenRes] = await Promise.all([
    supabase.from("contact_berichten").select(BERICHT_VELDEN).eq("id", id).maybeSingle(),
    supabase
      .from("contact_antwoorden")
      .select("id, bericht_id, tekst, verzonden_door, resend_id, verzonden_op")
      .eq("bericht_id", id)
      .order("verzonden_op"),
  ]);
  if (berichtRes.error) throw new Error(`Bericht laden mislukt: ${berichtRes.error.message}`);
  if (!berichtRes.data) notFound();
  const bericht = berichtRes.data as ContactBericht;
  const antwoorden = (antwoordenRes.data ?? []) as ContactAntwoord[];

  // Openen = gelezen.
  if (bericht.status === "nieuw") {
    const { error } = await supabase
      .from("contact_berichten")
      .update({ status: "gelezen" })
      .eq("id", id)
      .eq("status", "nieuw");
    if (!error) bericht.status = "gelezen";
  }

  const isSpam = bericht.status === "spam";
  const isArchief = bericht.status === "gearchiveerd";
  const aanhef = `Beste ${voornaamVan(bericht.naam)},\n\n`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/berichten" />
      <AdminKop
        terug={{ href: PAD, label: "Berichten" }}
        titel={bericht.onderwerp || "Bericht"}
        naastTitel={<BerichtStatusLabel status={bericht.status} />}
        beschrijving={`Van ${bericht.naam} · ${datumTijd(bericht.aangemaakt_op)}`}
      />

      {ok && <Melding soort="ok">{ok}</Melding>}
      {fout && <Melding soort="fout">{fout}</Melding>}

      <div className="flex flex-wrap gap-2">
        <ActieKnop id={id} actie="ongelezen">
          Markeer als ongelezen
        </ActieKnop>
        {isArchief ? (
          <ActieKnop id={id} actie="terugzetten">
            Terug naar inbox
          </ActieKnop>
        ) : (
          !isSpam && (
            <ActieKnop id={id} actie="archiveren">
              Archiveren
            </ActieKnop>
          )
        )}
        {isSpam ? (
          <ActieKnop id={id} actie="geen_spam">
            Geen spam
          </ActieKnop>
        ) : (
          <ActieKnop id={id} actie="spam">
            Markeer als spam
          </ActieKnop>
        )}
        <form action={verwijderBericht}>
          <input type="hidden" name="id" value={id} />
          <BevestigKnop
            bevestiging="Dit bericht en de antwoorden definitief verwijderen? Dit kan niet ongedaan worden gemaakt."
            className={knopGevaarKlein}
          >
            Verwijderen
          </BevestigKnop>
        </form>
      </div>

      <section className={`${kaartVlak} flex flex-col gap-4`}>
        <dl className="flex flex-col gap-1.5 text-sm">
          <Gegeven label="Naam">{bericht.naam}</Gegeven>
          <Gegeven label="E-mail">
            <a href={`mailto:${bericht.email}`} className="underline underline-offset-4">
              {bericht.email}
            </a>
          </Gegeven>
          {bericht.telefoon && (
            <Gegeven label="Telefoon">
              <a href={`tel:${bericht.telefoon.replace(/[^\d+]/g, "")}`} className="underline underline-offset-4">
                {bericht.telefoon}
              </a>
            </Gegeven>
          )}
          {bericht.onderwerp && <Gegeven label="Onderwerp">{bericht.onderwerp}</Gegeven>}
          {bericht.pagina && <Gegeven label="Pagina">{bericht.pagina}</Gegeven>}
          <Gegeven label="Adresboek">
            {bericht.relatie_id ? (
              <Link href={`/admin/adresboek/${bericht.relatie_id}`} className="underline underline-offset-4">
                Bekijk in het adresboek
              </Link>
            ) : (
              <span className="text-foreground/70">Niet gekoppeld</span>
            )}
          </Gegeven>
        </dl>
        <div className="whitespace-pre-wrap break-words border-t border-black/10 pt-4 leading-relaxed dark:border-white/15">
          {bericht.bericht}
        </div>
      </section>

      {antwoorden.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Antwoorden</h2>
          <ol className="flex flex-col gap-3">
            {antwoorden.map((a) => (
              <li
                key={a.id}
                className="ml-4 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm sm:ml-10 dark:border-emerald-900 dark:bg-emerald-950/20"
              >
                <p className="text-xs text-foreground/70">
                  {datumTijd(a.verzonden_op)}
                  {a.verzonden_door ? ` · verstuurd door ${a.verzonden_door}` : ""}
                </p>
                <div className="whitespace-pre-wrap break-words leading-relaxed">{a.tekst}</div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!isSpam && (
        <section className={kaart}>
          <h2 className="text-lg font-semibold">{antwoorden.length ? "Opnieuw antwoorden" : "Beantwoorden"}</h2>
          <p className="text-sm text-foreground/70">
            Wordt per e-mail verstuurd naar {bericht.email}, met het oorspronkelijke bericht als citaat eronder. Reageert{" "}
            {voornaamVan(bericht.naam) || "de afzender"} op je mail, dan komt die reactie binnen op het contact-e-mailadres uit de
            instellingen.
          </p>
          <form action={beantwoord} className="flex flex-col gap-3">
            <input type="hidden" name="id" value={id} />
            <label htmlFor="antwoord" className="sr-only">
              Je antwoord
            </label>
            <Tekstvak
              id="antwoord"
              name="tekst"
              required
              rows={10}
              max={MAX.antwoord}
              begin={aanhef}
              className={`${invoer} w-full resize-y leading-relaxed`}
            />
            <div>
              <VerzendKnop bezig="Bezig met versturen…" className={knop}>
                Antwoord versturen
              </VerzendKnop>
            </div>
          </form>
        </section>
      )}

      <section className={kaart}>
        <h2 className="text-lg font-semibold">Interne notitie</h2>
        <form action={bewaarNotitie} className="flex flex-col gap-3">
          <input type="hidden" name="id" value={id} />
          <label htmlFor="notitie" className="sr-only">
            Interne notitie
          </label>
          <textarea
            id="notitie"
            name="notitie"
            rows={3}
            maxLength={5_000}
            defaultValue={bericht.notitie}
            placeholder="Alleen zichtbaar in het beheer"
            className={`${invoer} w-full resize-y`}
          />
          <div>
            <button className={knopKlein}>Notitie opslaan</button>
          </div>
        </form>
      </section>
    </main>
  );
}
