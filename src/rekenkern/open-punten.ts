// Open punten uit de prompt, als data. Elk punt is configureerbaar gebouwd met de
// aangegeven standaardwaarde; hier staat wat nog door de adviseur bevestigd moet worden.

export interface OpenPunt {
  nr: number;
  onderwerp: string;
  standaard: string;
  status: "open";
}

export const OPEN_PUNTEN: OpenPunt[] = [
  {
    nr: 1,
    onderwerp: "Zandloper-regel: FFIT-bron of Excel-variant",
    standaard: "BESLOTEN: Excel-variant (config/ffit-regels.ts + instelling zandloper_variant)",
    status: "open",
  },
  {
    nr: 2,
    onderwerp: "Volledige tabel FFIT-type -> letter (5 letters: X, A, V, H, 8)",
    standaard:
      "BESLOTEN 29-9: Zandloper->X, Onderste/Bovenste zandloper->8, Lepel/Driehoek->A, Omgekeerde driehoek->V, Rechthoek->H",
    status: "open",
  },
  {
    nr: 3,
    onderwerp: "Schouderomvang of -breedte; gebruik schouder- en binnenbeenmaat",
    standaard: "BESLOTEN 29-9: schouder = OMVANG (meetinstructie uit Lida's PDF). Schouder + binnenbeen worden opgeslagen maar (nog) niet in de formule gebruikt.",
    status: "open",
  },
  {
    nr: 4,
    onderwerp:
      "Categorietabel: randgedrag onder/boven grenzen; lang-plus 178-179; typfout 175-1789",
    standaard: "Onder->tenger, boven->plus; 178-179 als 100-113; 175-1789 als 175-179",
    status: "open",
  },
  {
    nr: 5,
    onderwerp: "FFIT-grenzen zijn absolute verschillen; minder passend bij plus size",
    standaard: "Ongewijzigd; 130/120/135/125 -> Rechthoek",
    status: "open",
  },
  {
    nr: 6,
    onderwerp: "Prijs en bewaartermijn maten",
    standaard:
      "Beide in te stellen via Beheer -> Instellingen (prijs_cent, bewaartermijn_maten_dagen; ingesteld op 120 dagen). " +
      "Handmatige beoordeling bestaat niet meer (elke test krijgt automatisch een type), dus ook geen doorlooptijd.",
    status: "open",
  },
  {
    nr: 7,
    onderwerp: "Afbeeldingen voor silhouetvraag, meetinstructies en pasvormvragen",
    standaard:
      "Meetinstructies: ingebouwde tekeningen; de adviseur kan per maat een eigen foto uploaden via Beheer -> Meetinstructies. " +
      "Silhouet en pasvormvragen: tekeningen/placeholders.",
    status: "open",
  },
];
