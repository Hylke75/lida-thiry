/**
 * Haalt alle rijen van een query op in pagina's van 1000 (Supabase geeft er
 * standaard maximaal 1000 per keer). `haal` krijgt het bereik (van/tot, inclusief)
 * en geeft de query met `.range(van, tot)` terug; zorg voor een vaste volgorde.
 */
export async function alles<T>(
  haal: (van: number, tot: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const uit: T[] = [];
  for (let van = 0; ; van += 1000) {
    const { data, error } = await haal(van, van + 999);
    if (error) throw new Error(error.message);
    uit.push(...(data ?? []));
    if (!data || data.length < 1000) return uit;
  }
}
