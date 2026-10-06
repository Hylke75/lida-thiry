// Tijdslimiet en "stroomonderbreker" voor databaseverzoeken tijdens het renderen
// van de publieke site. Puur (geen Next/Supabase), zodat het los te testen is.
//
// Waarom: is Supabase traag of onbereikbaar, dan wachtte elke publieke pagina
// op meerdere verzoeken na elkaar (elk tot ~10 s verbindingstimeout): 7–14 s per
// pagina; supabase-js deed daar per query nog tot 7 s aan herhaalpogingen bij. Nu:
//   - elk verzoek krijgt een harde tijdslimiet (standaard 3 s), zonder herhaalpogingen;
//   - na een netwerkfout of tijdslimiet slaat de onderbreker verzoeken een
//     korte tijd (standaard 15 s) direct over, zodat de volgende leesfuncties
//     meteen hun standaardwaarden gebruiken in plaats van elk opnieuw te wachten.
// De leesfuncties falen al zacht (standaardteksten, lege lijsten); dit zorgt
// alleen dat dat snel gebeurt.

const STANDAARD_TIJDSLIMIET_MS = 3_000;
const STANDAARD_PAUZE_MS = 15_000;

export interface Stroomonderbreker {
  /** true = verzoeken nu overslaan (de database gaf net een fout). */
  isOpen(): boolean;
  meldFout(): void;
  meldSucces(): void;
}

export function maakStroomonderbreker(o: { pauzeMs?: number; nu?: () => number } = {}): Stroomonderbreker {
  const pauze = o.pauzeMs ?? STANDAARD_PAUZE_MS;
  const nu = o.nu ?? Date.now;
  let openTot = 0;
  return {
    isOpen: () => nu() < openTot,
    meldFout: () => {
      openTot = nu() + pauze;
    },
    meldSucces: () => {
      openTot = 0;
    },
  };
}

/** Fout die de onderbreker geeft terwijl hij open staat (geen netwerkverzoek gedaan). */
export class DatabaseOvergeslagen extends Error {
  constructor() {
    super("Database tijdelijk overgeslagen na een eerdere fout of tijdslimiet");
    this.name = "DatabaseOvergeslagen";
  }
}

/** Combineert het signaal van de aanroeper met een tijdslimiet. */
function signaalMetLimiet(eigen: AbortSignal | null | undefined, ms: number): AbortSignal {
  const limiet = AbortSignal.timeout(ms);
  return eigen ? AbortSignal.any([eigen, limiet]) : limiet;
}

/**
 * Een fetch met een tijdslimiet per verzoek en (optioneel) een stroomonderbreker.
 * Een antwoord met status ≥ 500 telt voor de onderbreker als fout, maar wordt
 * gewoon teruggegeven (de aanroeper leest de foutmelding zelf).
 */
export function fetchMetTijdslimiet(
  basis: typeof fetch,
  o: { ms?: number; onderbreker?: Stroomonderbreker } = {},
): typeof fetch {
  const ms = o.ms ?? STANDAARD_TIJDSLIMIET_MS;
  return async (invoer, init) => {
    if (o.onderbreker?.isOpen()) throw new DatabaseOvergeslagen();
    try {
      const res = await basis(invoer, { ...init, signal: signaalMetLimiet(init?.signal, ms) });
      if (res.status >= 500) o.onderbreker?.meldFout();
      else o.onderbreker?.meldSucces();
      return res;
    } catch (e) {
      // Afgebroken door de aanroeper zelf telt niet als databasefout.
      if (!init?.signal?.aborted) o.onderbreker?.meldFout();
      throw e;
    }
  };
}

