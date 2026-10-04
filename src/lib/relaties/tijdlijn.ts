// Pure opbouw van de tijdlijn van een relatie: bestellingen, nieuwsbrief,
// contactberichten en wijzigingen aan de relatie zelf, nieuwste eerst.

export interface TijdlijnBestelling {
  id: string;
  status: string;
  bedrag_cent: number | null;
  valuta?: string | null;
  toegekend_type: string | null;
  aangemaakt_op: string;
  betaald_op: string | null;
  afgerond_op: string | null;
}

export interface TijdlijnNieuwsbrief {
  id: string;
  status: string;
  aangemaakt_op: string;
  bevestigd_op: string | null;
  afgemeld_op: string | null;
}

export interface TijdlijnVerzending {
  id: string;
  status: string;
  verzonden_op: string | null;
  aangemaakt_op: string;
  geopend_op: string | null;
  aantal_geopend: number;
  geklikt_op: string | null;
  aantal_kliks: number;
  campagne: { id: string; naam: string } | null;
}

export interface TijdlijnBericht {
  id: string;
  onderwerp: string;
  status: string;
  aangemaakt_op: string;
}

export interface TijdlijnAntwoord {
  id: string;
  bericht_id: string;
  verzonden_op: string;
}

export type TijdlijnSoort = "relatie" | "bestelling" | "nieuwsbrief" | "mail" | "bericht";

export interface TijdlijnItem {
  sleutel: string;
  soort: TijdlijnSoort;
  op: string;
  titel: string;
  details: string[];
  link?: string;
}

export interface TijdlijnInvoer {
  relatie: { aangemaakt_op: string; bijgewerkt_op: string; bronLabel: string };
  bestellingen: readonly TijdlijnBestelling[];
  nieuwsbrief: TijdlijnNieuwsbrief | null;
  verzendingen: readonly TijdlijnVerzending[];
  berichten: readonly TijdlijnBericht[];
  antwoorden: readonly TijdlijnAntwoord[];
  /** Labels en opmaak, zodat dit bestand puur blijft. */
  labels: {
    orderStatus: (s: string) => string;
    bedrag: (cent: number, valuta?: string | null) => string;
    figuurtype: (sleutel: string) => string;
    nieuwsbriefStatus: (s: string) => string;
    berichtStatus: (s: string) => string;
  };
}

const NB_PAD = "/admin/nieuwsbrief/contacten";

/** Alle gebeurtenissen, nieuwste eerst. */
export function bouwTijdlijn(i: TijdlijnInvoer): TijdlijnItem[] {
  const uit: TijdlijnItem[] = [];
  const l = i.labels;

  uit.push({
    sleutel: "relatie-aangemaakt",
    soort: "relatie",
    op: i.relatie.aangemaakt_op,
    titel: "In het adresboek gekomen",
    details: [`Bron: ${i.relatie.bronLabel}`],
  });
  // Alleen tonen als er echt later iets gewijzigd is (niet direct bij het aanmaken).
  if (Date.parse(i.relatie.bijgewerkt_op) - Date.parse(i.relatie.aangemaakt_op) > 60_000) {
    uit.push({ sleutel: "relatie-bijgewerkt", soort: "relatie", op: i.relatie.bijgewerkt_op, titel: "Gegevens laatst bijgewerkt", details: [] });
  }

  for (const o of i.bestellingen) {
    const details = [l.orderStatus(o.status)];
    if (o.bedrag_cent !== null && o.bedrag_cent !== undefined) details.push(l.bedrag(o.bedrag_cent, o.valuta));
    if (o.toegekend_type) details.push(`Figuurtype ${l.figuurtype(o.toegekend_type)}`);
    if (o.betaald_op) details.push(`betaald ${o.betaald_op.slice(0, 10)}`);
    uit.push({ sleutel: `order-${o.id}`, soort: "bestelling", op: o.aangemaakt_op, titel: "Bestelling", details, link: `/admin/order/${o.id}` });
    if (o.afgerond_op) {
      uit.push({
        sleutel: `order-afgerond-${o.id}`,
        soort: "bestelling",
        op: o.afgerond_op,
        titel: "Test afgerond",
        details: o.toegekend_type ? [`Figuurtype ${l.figuurtype(o.toegekend_type)}`] : [],
        link: `/admin/order/${o.id}`,
      });
    }
  }

  const nb = i.nieuwsbrief;
  if (nb) {
    const link = `${NB_PAD}/${nb.id}`;
    uit.push({
      sleutel: "nb-aangemeld",
      soort: "nieuwsbrief",
      op: nb.aangemaakt_op,
      titel: "Nieuwsbriefcontact aangemaakt",
      details: [`Huidige status: ${l.nieuwsbriefStatus(nb.status)}`],
      link,
    });
    if (nb.bevestigd_op && Date.parse(nb.bevestigd_op) - Date.parse(nb.aangemaakt_op) > 60_000) {
      uit.push({ sleutel: "nb-bevestigd", soort: "nieuwsbrief", op: nb.bevestigd_op, titel: "Aanmelding nieuwsbrief bevestigd", details: [], link });
    }
    if (nb.afgemeld_op) {
      uit.push({ sleutel: "nb-afgemeld", soort: "nieuwsbrief", op: nb.afgemeld_op, titel: "Afgemeld voor de nieuwsbrief", details: [], link });
    }
    for (const v of i.verzendingen) {
      if (v.status !== "verzonden") continue;
      const details = [
        v.geopend_op ? `geopend${v.aantal_geopend > 1 ? ` (${v.aantal_geopend}×)` : ""}` : "niet geopend",
        v.geklikt_op ? `geklikt (${v.aantal_kliks}×)` : "niet geklikt",
      ];
      uit.push({
        sleutel: `mail-${v.id}`,
        soort: "mail",
        op: v.verzonden_op ?? v.aangemaakt_op,
        titel: `Nieuwsbrief ontvangen: ${v.campagne?.naam ?? "verwijderde campagne"}`,
        details,
        link,
      });
    }
  }

  for (const b of i.berichten) {
    uit.push({
      sleutel: `bericht-${b.id}`,
      soort: "bericht",
      op: b.aangemaakt_op,
      titel: `Bericht: ${b.onderwerp.trim() || "(geen onderwerp)"}`,
      details: [l.berichtStatus(b.status)],
      link: `/admin/berichten/${b.id}`,
    });
  }
  for (const a of i.antwoorden) {
    uit.push({
      sleutel: `antwoord-${a.id}`,
      soort: "bericht",
      op: a.verzonden_op,
      titel: "Antwoord op bericht verstuurd",
      details: [],
      link: `/admin/berichten/${a.bericht_id}`,
    });
  }

  return uit.sort((a, b) => Date.parse(b.op) - Date.parse(a.op) || a.sleutel.localeCompare(b.sleutel));
}
