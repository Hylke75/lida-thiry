import "server-only";

/** Datum + tijd in Nederlandse notatie, bijv. "2 okt 2026, 15:20". */
export function formatteerMoment(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Amsterdam",
  });
}

type Pagina<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

/**
 * Haalt alle rijen op in blokken van 1000 (PostgREST geeft er maximaal 1000
 * per verzoek). De query moet een vaste sortering hebben.
 */
export async function alleRijen<T>(pagina: (van: number, tot: number) => Pagina<T>): Promise<T[]> {
  const alles: T[] = [];
  for (let van = 0; ; van += 1000) {
    const { data, error } = await pagina(van, van + 999);
    if (error) throw new Error(error.message);
    alles.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return alles;
}
