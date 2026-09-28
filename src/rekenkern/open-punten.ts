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
    standaard: "FFIT-bronversie (config/ffit-regels.ts: STANDAARD_ZANDLOPER_VARIANT)",
    status: "open",
  },
  {
    nr: 2,
    onderwerp: "Volledige tabel FFIT-type -> letter (5 letters: X, A, V, H, 8)",
    standaard:
      "Alleen Zandloper->X, Driehoek/peer->A, Omgekeerde driehoek->V bekend; rest null",
    status: "open",
  },
  {
    nr: 3,
    onderwerp: "Schouderomvang of -breedte; gebruik schouder- en binnenbeenmaat",
    standaard: "Opgeslagen, niet in de formule gebruikt",
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
    onderwerp: "Prijs, bewaartermijn maten, doorlooptijd handmatige beoordeling",
    standaard: "Bewaartermijn 30 dagen; prijs en doorlooptijd nog leeg",
    status: "open",
  },
  {
    nr: 7,
    onderwerp: "Afbeeldingen voor silhouetvraag, meetinstructies en pasvormvragen",
    standaard: "Placeholders",
    status: "open",
  },
];
