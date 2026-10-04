import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { berichtenPerStatus, berichtenQuery, type ContactBericht } from "@/lib/contact/berichten";
import {
  BERICHT_STATUS_LABEL,
  BERICHT_STATUSSEN,
  BERICHTEN_PER_PAGINA,
  berichtFilterQuery,
  leesBerichtFilter,
  voorproef,
  type BerichtFilter,
  type BerichtWeergave,
} from "@/lib/contact/regels";
import { AdminNav, Melding } from "../AdminNav";
import { BerichtStatusLabel, datumTijd, hoofdknop, invoer, kleineKnop } from "./stijl";

export const dynamic = "force-dynamic";

const PAD = "/admin/berichten";

export default async function BerichtenPagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await vereisBeheerder();
  const zoek = await searchParams;
  const filter = leesBerichtFilter(zoek);
  const ok = typeof zoek.ok === "string" ? zoek.ok : null;
  const fout = typeof zoek.fout === "string" ? zoek.fout : null;

  const van = (filter.pagina - 1) * BERICHTEN_PER_PAGINA;
  const [lijst, tellingen] = await Promise.all([
    berichtenQuery(filter).range(van, van + BERICHTEN_PER_PAGINA - 1),
    berichtenPerStatus().catch(() => null),
  ]);
  const berichten = (lijst.data ?? []) as ContactBericht[];
  const totaal = lijst.count ?? 0;
  const paginas = Math.max(1, Math.ceil(totaal / BERICHTEN_PER_PAGINA));
  const link = (wijziging: Partial<BerichtFilter>) => {
    const q = berichtFilterQuery({ ...filter, pagina: 1, ...wijziging });
    return q ? `${PAD}?${q}` : PAD;
  };

  const tabs: { weergave: BerichtWeergave; label: string; aantal: number | null }[] = [
    {
      weergave: "inbox",
      label: "Inbox",
      aantal: tellingen ? tellingen.nieuw + tellingen.gelezen + tellingen.beantwoord : null,
    },
    ...BERICHT_STATUSSEN.map((s) => ({ weergave: s, label: BERICHT_STATUS_LABEL[s], aantal: tellingen?.[s] ?? null })),
  ];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/berichten" />
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Berichten</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Berichten via het contactformulier. Teksten van het formulier en de mails pas je aan in{" "}
          <Link href="/admin/teksten/contact" className="underline underline-offset-4">
            Teksten → Contact
          </Link>
          .
        </p>
      </header>

      {ok && <Melding soort="ok">{ok}</Melding>}
      {(fout || lijst.error) && <Melding soort="fout">{fout ?? "Berichten laden mislukt. Probeer het later opnieuw."}</Melding>}

      <nav aria-label="Berichten per status" className="flex flex-wrap gap-2 text-sm">
        {tabs.map((t) => {
          const actief = filter.weergave === t.weergave;
          return (
            <Link
              key={t.weergave}
              href={link({ weergave: t.weergave, q: filter.q })}
              aria-current={actief ? "page" : undefined}
              className={`flex items-baseline gap-2 rounded-lg border px-3 py-2 ${
                actief
                  ? "border-accent/50 bg-accent-zacht"
                  : "border-black/10 bg-kaart hover:border-accent/30 dark:border-white/15"
              }`}
            >
              <span className="text-black/70 dark:text-white/70">{t.label}</span>
              {t.aantal != null && (
                <span
                  className={`rounded-full px-1.5 text-xs tabular-nums ${
                    t.weergave === "nieuw" && t.aantal > 0
                      ? "bg-accent font-semibold text-background"
                      : "text-black/50 dark:text-white/50"
                  }`}
                >
                  {t.aantal}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <form action={PAD} method="get" className="flex flex-wrap gap-2">
        {filter.weergave !== "inbox" && <input type="hidden" name="status" value={filter.weergave} />}
        <input
          name="q"
          defaultValue={filter.q}
          placeholder="Zoek op naam, e-mail, onderwerp of tekst"
          aria-label="Zoeken"
          className={`${invoer} flex-1`}
        />
        <button className={hoofdknop}>Zoeken</button>
      </form>
      <p className="-mt-3 text-sm text-black/60 dark:text-white/60">
        {totaal} bericht{totaal === 1 ? "" : "en"}
        {filter.q && (
          <>
            {" "}gevonden ·{" "}
            <Link href={link({ q: undefined })} className="underline underline-offset-4">
              zoekterm wissen
            </Link>
          </>
        )}
      </p>

      {berichten.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">
          {filter.q
            ? "Geen berichten gevonden."
            : filter.weergave === "inbox"
              ? "Nog geen berichten. Zet {contactformulier} op een pagina om berichten te ontvangen."
              : "Geen berichten met deze status."}
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10 bg-kaart dark:divide-white/10 dark:border-white/15">
          {berichten.map((b) => {
            const ongelezen = b.status === "nieuw";
            return (
              <li key={b.id}>
                <Link
                  href={`${PAD}/${b.id}`}
                  prefetch={false}
                  className="flex items-start gap-3 px-3 py-3 text-sm hover:bg-black/[0.02] dark:hover:bg-white/[0.03]"
                >
                  <span
                    aria-hidden="true"
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ongelezen ? "bg-accent" : "bg-transparent"}`}
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className={ongelezen ? "font-semibold" : "font-medium"}>
                        {ongelezen && <span className="sr-only">Ongelezen: </span>}
                        {b.naam}
                      </span>
                      <span className="truncate text-black/50 dark:text-white/50">{b.email}</span>
                    </span>
                    {b.onderwerp && <span className={ongelezen ? "font-semibold" : ""}>{b.onderwerp}</span>}
                    <span className="truncate text-black/60 dark:text-white/60">{voorproef(b.bericht)}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-black/50 dark:text-white/50">{datumTijd(b.aangemaakt_op)}</span>
                    {filter.weergave === "inbox" && b.status !== "nieuw" && <BerichtStatusLabel status={b.status} />}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {paginas > 1 && (
        <nav aria-label="Pagina's" className="flex items-center justify-between text-sm">
          {filter.pagina > 1 ? (
            <Link href={link({ q: filter.q, pagina: filter.pagina - 1 })} className={kleineKnop}>
              ← Vorige
            </Link>
          ) : (
            <span />
          )}
          <span className="text-black/60 dark:text-white/60">
            Pagina {filter.pagina} van {paginas}
          </span>
          {filter.pagina < paginas ? (
            <Link href={link({ q: filter.q, pagina: filter.pagina + 1 })} className={kleineKnop}>
              Volgende →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </main>
  );
}
