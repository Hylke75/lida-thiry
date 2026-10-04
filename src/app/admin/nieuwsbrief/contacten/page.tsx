import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import type { Contact } from "@/lib/nieuwsbrief/contacten";
import { alleTags, contactenQuery, tellingPerStatus } from "@/lib/nieuwsbrief/beheer";
import { formulierNamen } from "@/lib/nieuwsbrief/formulieren";
import { BRON_LABEL, BRONNEN, STATUS_LABEL, STATUSSEN } from "@/lib/nieuwsbrief/doelgroep";
import { filterQuery, leesFilter, PER_PAGINA } from "@/lib/nieuwsbrief/contactregels";
import { AdminNav, Melding } from "../../AdminNav";
import { bulkActie, voegContactToe } from "./acties";
import { BevestigKnop, SelecteerAlles, TagInvoer } from "./Invoer";
import { StatusLabel, datum, invoer, hoofdknop, kleineKnop } from "./stijl";

export const dynamic = "force-dynamic";

const PAD = "/admin/nieuwsbrief/contacten";

export default async function ContactenPagina({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await vereisBeheerder("nieuwsbrief_contacten");
  const zoek = await searchParams;
  const filter = leesFilter(zoek);
  const ok = typeof zoek.ok === "string" ? zoek.ok : null;
  const fout = typeof zoek.fout === "string" ? zoek.fout : null;

  const van = (filter.pagina - 1) * PER_PAGINA;
  const [lijst, tellingen, tags, formulieren] = await Promise.all([
    contactenQuery(filter, { tellen: true }).range(van, van + PER_PAGINA - 1),
    tellingPerStatus(),
    alleTags().catch(() => [] as string[]),
    formulierNamen().catch(() => new Map<string, { naam: string; slug: string }>()),
  ]);
  const contacten = (lijst.data ?? []) as Contact[];
  const totaal = lijst.count ?? 0;
  const paginas = Math.max(1, Math.ceil(totaal / PER_PAGINA));
  const gefilterd = Boolean(filter.q || filter.status || filter.tag || filter.bron || filter.formulier);
  const huidig = `${PAD}${filterQuery(filter) ? `?${filterQuery(filter)}` : ""}`;
  const link = (wijziging: Partial<typeof filter>) => {
    const q = filterQuery({ ...filter, pagina: 1, ...wijziging });
    return q ? `${PAD}?${q}` : PAD;
  };
  const exportQuery = filterQuery({ ...filter, pagina: undefined });

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/nieuwsbrief/contacten" />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Link href="/admin/nieuwsbrief" className="text-sm text-black/50 underline underline-offset-4 dark:text-white/50">
            ← Nieuwsbrief
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Contacten</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`${PAD}/import`} className={kleineKnop}>
            CSV importeren
          </Link>
          <a href={`${PAD}/export${exportQuery ? `?${exportQuery}` : ""}`} className={kleineKnop}>
            CSV exporteren{gefilterd ? " (huidig filter)" : ""}
          </a>
        </div>
      </header>

      {ok && <Melding soort="ok">{ok}</Melding>}
      {(fout || lijst.error) && <Melding soort="fout">{fout ?? `Contacten laden mislukt: ${lijst.error?.message}`}</Melding>}

      <nav aria-label="Aantal per status" className="flex flex-wrap gap-2 text-sm">
        {STATUSSEN.map((s) => (
          <Link
            key={s}
            href={link({ status: filter.status === s ? undefined : s })}
            aria-current={filter.status === s ? "true" : undefined}
            className={`flex items-baseline gap-2 rounded-lg border px-3 py-2 ${
              filter.status === s
                ? "border-accent/50 bg-accent-zacht"
                : "border-black/10 bg-kaart hover:border-accent/30 dark:border-white/15"
            }`}
          >
            <span className="text-lg font-semibold tabular-nums">{tellingen[s]}</span>
            <span className="text-black/60 dark:text-white/60">{STATUS_LABEL[s]}</span>
          </Link>
        ))}
      </nav>

      <form action={PAD} method="get" className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={filter.q} placeholder="Zoek op e-mail of naam" aria-label="Zoeken" className={invoer} />
        <select name="status" defaultValue={filter.status ?? ""} aria-label="Status" className={invoer}>
          <option value="">Alle statussen</option>
          {STATUSSEN.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select name="tag" defaultValue={filter.tag ?? ""} aria-label="Tag" className={invoer}>
          <option value="">Alle tags</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select name="bron" defaultValue={filter.bron ?? ""} aria-label="Bron" className={invoer}>
          <option value="">Alle bronnen</option>
          {BRONNEN.map((b) => (
            <option key={b} value={b}>
              {BRON_LABEL[b]}
            </option>
          ))}
        </select>
        {filter.formulier && <input type="hidden" name="formulier" value={filter.formulier} />}
        <button className={hoofdknop}>Zoeken</button>
      </form>
      {filter.formulier && (
        <p className="-mt-3 text-sm">
          Alleen aanmeldingen via formulier{" "}
          <Link href={`/admin/nieuwsbrief/formulieren/${filter.formulier}`} className="font-medium underline underline-offset-4">
            {formulieren.get(filter.formulier)?.naam ?? "(verwijderd formulier)"}
          </Link>{" "}
          ·{" "}
          <Link href={link({ formulier: undefined })} className="underline underline-offset-4">
            alle formulieren
          </Link>
        </p>
      )}
      <p className="-mt-3 text-sm text-black/60 dark:text-white/60">
        {totaal} contact{totaal === 1 ? "" : "en"}
        {gefilterd && (
          <>
            {" "}gevonden ·{" "}
            <Link href={PAD} className="underline underline-offset-4">
              filter wissen
            </Link>
          </>
        )}
      </p>

      <form action={bulkActie} className="flex flex-col gap-3">
        <input type="hidden" name="terug" value={huidig} />
        {contacten.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-kaart p-3 text-sm dark:border-white/15">
            <label className="flex items-center gap-2">
              <SelecteerAlles />
              <span>Alles</span>
            </label>
            <span className="text-black/40 dark:text-white/40">·</span>
            <span className="text-black/60 dark:text-white/60">Met selectie:</span>
            <input name="tag" list="bestaande-tags" placeholder="tag" aria-label="Tag voor de selectie" className={`${invoer} w-32 py-1`} />
            <datalist id="bestaande-tags">
              {tags.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
            <button name="actie" value="tag_toevoegen" className={kleineKnop}>
              Tag toevoegen
            </button>
            <button name="actie" value="tag_verwijderen" className={kleineKnop}>
              Tag weghalen
            </button>
            <BevestigKnop
              name="actie"
              value="afmelden"
              bevestiging="De geselecteerde contacten afmelden? Ze ontvangen dan geen nieuwsbrieven meer."
              className={kleineKnop}
            >
              Afmelden
            </BevestigKnop>
            <BevestigKnop
              name="actie"
              value="verwijderen"
              bevestiging="De geselecteerde contacten definitief verwijderen? Dit kan niet ongedaan worden gemaakt."
              className={`${kleineKnop} border-red-300 text-red-700 dark:border-red-800 dark:text-red-300`}
            >
              Verwijderen
            </BevestigKnop>
          </div>
        )}

        {contacten.length === 0 ? (
          <p className="text-sm text-black/50 dark:text-white/50">
            {gefilterd ? "Geen contacten gevonden." : "Nog geen contacten. Voeg er hieronder een toe of importeer een CSV-bestand."}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10 bg-kaart dark:divide-white/10 dark:border-white/15">
            {contacten.map((c) => (
              <li key={c.id} className="flex items-start gap-3 px-3 py-2.5 text-sm">
                <input type="checkbox" name="id" value={c.id} aria-label={`Selecteer ${c.email}`} className="mt-1 accent-accent" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <Link href={`${PAD}/${c.id}`} className="truncate font-medium hover:text-accent hover:underline">
                      {c.email}
                    </Link>
                    {c.naam && <span className="text-black/60 dark:text-white/60">{c.naam}</span>}
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5 text-xs text-black/50 dark:text-white/50">
                    <span>{BRON_LABEL[c.bron]}</span>
                    {c.formulier_id && formulieren.has(c.formulier_id) && (
                      <Link href={link({ formulier: c.formulier_id })} className="hover:text-accent hover:underline">
                        · via formulier {formulieren.get(c.formulier_id)?.naam}
                      </Link>
                    )}
                    <span>· {datum(c.aangemaakt_op)}</span>
                    {c.tags.map((t) => (
                      <Link key={t} href={link({ tag: t })} className="rounded-full bg-accent-zacht px-2 py-0.5 text-accent">
                        {t}
                      </Link>
                    ))}
                  </span>
                </div>
                <StatusLabel status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </form>

      {paginas > 1 && (
        <nav aria-label="Pagina's" className="flex items-center justify-between text-sm">
          {filter.pagina > 1 ? (
            <Link href={link({ pagina: filter.pagina - 1 })} className={kleineKnop}>
              ← Vorige
            </Link>
          ) : (
            <span />
          )}
          <span className="text-black/60 dark:text-white/60">
            Pagina {filter.pagina} van {paginas}
          </span>
          {filter.pagina < paginas ? (
            <Link href={link({ pagina: filter.pagina + 1 })} className={kleineKnop}>
              Volgende →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-black/10 bg-kaart p-5 dark:border-white/15">
        <h2 className="text-lg font-semibold">Contact toevoegen</h2>
        <form action={voegContactToe} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">E-mailadres *</span>
            <input name="email" type="email" required className={invoer} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Naam</span>
            <input name="naam" maxLength={120} className={invoer} />
          </label>
          <div className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="text-black/70 dark:text-white/70">Tags</span>
            <TagInvoer name="tags" suggesties={tags} />
          </div>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="toestemming" required className="mt-1 accent-accent" />
            <span>
              Deze persoon heeft toestemming gegeven om de nieuwsbrief te ontvangen.{" "}
              <span className="text-black/50 dark:text-white/50">
                Dit wordt met je naam en de datum vastgelegd als bewijs van toestemming.
              </span>
            </span>
          </label>
          <div className="sm:col-span-2">
            <button className={hoofdknop}>Toevoegen</button>
          </div>
        </form>
      </section>
    </main>
  );
}
