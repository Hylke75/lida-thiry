import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { sorteerSleutel } from "@/lib/beeldbank";
import { letterNaam, telPerType } from "@/lib/adviestypes-beheer";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { AdminNav } from "../AdminNav";
import { formatteerMoment, alleRijen } from "./gedeeld";

export const dynamic = "force-dynamic";

interface TypeRij {
  sleutel: string;
  letter: string;
  categorie: number;
  titel: string;
  bijgewerkt_op: string | null;
}

async function laad() {
  const supabase = adminClient();
  const [typesRes, secties, koppelingen] = await Promise.all([
    supabase.from("adviestypes").select("sleutel, letter, categorie, titel, bijgewerkt_op"),
    alleRijen<{ id: string; type_sleutel: string; bijgewerkt_op: string | null }>((van, tot) =>
      supabase.from("adviessecties").select("id, type_sleutel, bijgewerkt_op").order("id").range(van, tot),
    ),
    // ~1800 rijen: PostgREST geeft er maximaal 1000 per keer, dus pagineren.
    alleRijen<{ sectie_id: string }>((van, tot) =>
      supabase.from("sectie_beelden").select("sectie_id").order("sectie_id").order("volgorde").range(van, tot),
    ),
  ]);
  if (typesRes.error) throw new Error(`adviestypes lezen: ${typesRes.error.message}`);
  const types = ((typesRes.data ?? []) as TypeRij[]).sort((a, b) => sorteerSleutel(a.sleutel) - sorteerSleutel(b.sleutel));
  return { types, telling: telPerType(types, secties, koppelingen) };
}

export default async function TypesPagina({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; letter?: string; categorie?: string; aandacht?: string }>;
}) {
  await vereisBeheerder("advies");
  const { q = "", letter = "", categorie = "", aandacht } = await searchParams;
  const { types, telling } = await laad();
  const letters = (await haalLichaamstypes()).map((t) => ({ letter: t.code, naam: t.naam }));

  const zoek = q.trim().toLowerCase();
  const cat = Number(categorie) || null;
  const metAandacht = (s: string) => telling[s].secties === 0 || telling[s].beelden === 0;
  const zichtbaar = types.filter(
    (t) =>
      (!letter || t.letter === letter) &&
      (!cat || t.categorie === cat) &&
      (!aandacht || metAandacht(t.sleutel)) &&
      (!zoek || t.sleutel.toLowerCase().includes(zoek) || t.titel.toLowerCase().includes(zoek)),
  );
  const aantalAandacht = types.filter((t) => metAandacht(t.sleutel)).length;
  const gefilterd = Boolean(zoek || letter || cat || aandacht);

  const link = (wijziging: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const huidig = { q, letter, categorie, aandacht, ...wijziging };
    for (const [k, v] of Object.entries(huidig)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/admin/types?${s}` : "/admin/types";
  };
  const chip = (actief: boolean) =>
    `rounded-full px-3 py-1.5 text-sm ${
      actief
        ? "bg-accent-zacht font-medium text-accent"
        : "border border-black/10 text-black/60 hover:bg-black/5 dark:border-white/15 dark:text-white/60 dark:hover:bg-white/5"
    }`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/types" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Adviestypes</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Hier beheer je de {types.length} hand-outs: per type de titel, de vaste velden met tekst en de beelden. Klik op een
          type om het te bewerken. Wijzigingen gelden voor nieuwe PDF&rsquo;s; al verstuurde PDF&rsquo;s veranderen niet.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-4 dark:border-white/15">
        <form action="/admin/types" className="flex flex-col gap-2 sm:flex-row">
          {letter && <input type="hidden" name="letter" value={letter} />}
          {aandacht && <input type="hidden" name="aandacht" value={aandacht} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Zoek op code (bijv. 6A) of titel"
            className="flex-1 rounded-lg border border-black/15 bg-background px-3 py-2 outline-none focus:border-accent dark:border-white/20"
          />
          <select
            name="categorie"
            defaultValue={categorie}
            className="rounded-lg border border-black/15 bg-background px-3 py-2 dark:border-white/20"
          >
            <option value="">Alle categorieën</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((c) => (
              <option key={c} value={c}>
                Categorie {c}
              </option>
            ))}
          </select>
          <button className="rounded-full bg-foreground px-5 py-2 text-sm text-background hover:opacity-90">Zoeken</button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={link({ letter: undefined })} className={chip(!letter)}>
            Alle figuren
          </Link>
          {letters.map((l) => (
            <Link key={l.letter} href={link({ letter: l.letter })} className={chip(letter === l.letter)}>
              {l.letter} · {l.naam}
            </Link>
          ))}
          {aantalAandacht > 0 && (
            <Link
              href={link({ aandacht: aandacht ? undefined : "1" })}
              className={`${chip(Boolean(aandacht))} ml-auto`}
              title="Types zonder ingevulde velden of zonder beelden"
            >
              Aandachtspunten ({aantalAandacht})
            </Link>
          )}
        </div>
        {gefilterd && (
          <p className="text-xs text-black/50 dark:text-white/50">
            {zichtbaar.length} van {types.length} types.{" "}
            <Link href="/admin/types" className="underline underline-offset-2">
              Filters wissen
            </Link>
          </p>
        )}
      </div>

      {zichtbaar.length === 0 ? (
        <p className="text-sm text-black/50 dark:text-white/50">Geen types gevonden.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-black/10 bg-kaart dark:border-white/15">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 text-xs uppercase tracking-wide text-black/50 dark:border-white/15 dark:text-white/50">
              <tr>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Titel</th>
                <th className="px-4 py-3 text-right font-medium">Velden</th>
                <th className="px-4 py-3 text-right font-medium">Beelden</th>
                <th className="px-4 py-3 font-medium">Laatst bewerkt</th>
              </tr>
            </thead>
            <tbody>
              {zichtbaar.map((t, i) => {
                const tel = telling[t.sleutel];
                const nieuweCategorie = i === 0 || zichtbaar[i - 1].categorie !== t.categorie;
                return (
                  <tr
                    key={t.sleutel}
                    className={`hover:bg-black/[0.03] dark:hover:bg-white/[0.04] ${
                      nieuweCategorie && i > 0 ? "border-t-2 border-black/10 dark:border-white/15" : "border-t border-black/5 dark:border-white/5"
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/types/${t.sleutel}`} className="font-medium text-accent underline-offset-4 hover:underline">
                        {t.sleutel}
                      </Link>
                      <span className="block text-xs text-black/45 dark:text-white/45">
                        cat. {t.categorie} · {letterNaam(t.letter, letters)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <Link href={`/admin/types/${t.sleutel}`} className="hover:underline">
                        {t.titel}
                      </Link>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {tel.secties === 0 && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-300">
                            Geen velden
                          </span>
                        )}
                        {tel.secties > 0 && tel.beelden === 0 && (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            Geen beelden
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{tel.secties}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{tel.beelden}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-black/60 dark:text-white/60">
                      {formatteerMoment(tel.laatstBewerkt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
