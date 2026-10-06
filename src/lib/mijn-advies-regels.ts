// Pure regels voor "Mijn advies opnieuw ontvangen": welke links krijgt iemand
// voor de bestellingen op zijn of haar e-mailadres?

import { adviesDownloadbaar, tokenVerlopen } from "./advies-toegang";

export interface MijnAdviesOrder {
  klantnaam: string;
  status: string;
  testtoken: string | null;
  toegekend_type: string | null;
  afgerond_op: string | null;
  betaald_op: string | null;
  aangemaakt_op: string;
  token_verloopt_op: string | null;
}

export interface AdviesLink {
  type: string;
  afgerondOp: string | null;
  /** Download van de advies-PDF. */
  url: string;
  /** "Jouw figuurtype": uitleg over het type, achter dezelfde testlink. */
  figuurUrl: string;
}

export interface TestLink {
  besteldOp: string;
  verlooptOp: string | null;
  url: string;
}

/** Statussen waarin de test betaald is maar nog niet is afgerond. */
const TEST_OPEN = ["betaald"];

/** Bepaalt de downloadlinks (afgeronde adviezen) en de links om verder te gaan met de test. */
export function mijnAdviesLinks(
  orders: readonly MijnAdviesOrder[],
  basisUrl: string,
  nu: Date = new Date(),
): { naam: string | null; adviezen: AdviesLink[]; tests: TestLink[] } {
  const adviezen: AdviesLink[] = [];
  const tests: TestLink[] = [];
  const gesorteerd = [...orders].sort(
    (a, b) => new Date(b.aangemaakt_op).getTime() - new Date(a.aangemaakt_op).getTime(),
  );
  for (const o of gesorteerd) {
    if (!o.testtoken) continue;
    const token = encodeURIComponent(o.testtoken);
    if (adviesDownloadbaar(o, nu) && o.toegekend_type) {
      adviezen.push({
        type: o.toegekend_type,
        afgerondOp: o.afgerond_op,
        url: `${basisUrl}/api/test/${token}/pdf`,
        figuurUrl: `${basisUrl}/test/${token}/figuurtype`,
      });
    } else if (TEST_OPEN.includes(o.status) && !tokenVerlopen(o, nu)) {
      tests.push({
        besteldOp: o.betaald_op ?? o.aangemaakt_op,
        verlooptOp: o.token_verloopt_op,
        url: `${basisUrl}/test/${token}`,
      });
    }
  }
  const naam = gesorteerd.find((o) => o.klantnaam.trim())?.klantnaam.trim() ?? null;
  return { naam, adviezen: adviezen.slice(0, 10), tests: tests.slice(0, 10) };
}
