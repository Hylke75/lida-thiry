// Configuratie F: de rekenmethode van Lida Thiry (antwoorden van 26-10-2026).
//
// Naast de omtrekken kijkt deze methode naar wat de FFIT-methode mist:
// - het breedste punt in de spiegel (schouders, gelijk of heupen): het verschil
//   tussen V en H, en tussen X en de Lepel (8);
// - de vorm van de heup (hoge heup t.o.v. lage heup): het "plankje" van de
//   Lepel (8) tegenover de ronde overgang van de Peer (A);
// - de lengte van het bovenlichaam (Lida's handentest): kort bij de Lepel, H
//   en V, gemiddeld bij de Zandloper, lang bij de Peer.
// Verschillen tellen in procenten, niet in vaste centimeters (Lida, vraag 5).
//
// De grenzen zijn instelbaar in Beheer → Rekentool. Van Lida: taille 25% kleiner
// (zandloper). De rest is een VOORSTEL, door Lida te toetsen met de proefberekening.

export const BREEDSTE_PUNTEN = ["schouders", "gelijk", "heupen"] as const;
export type BreedstePunt = (typeof BREEDSTE_PUNTEN)[number];

export const BOVENLICHAAM_LENGTES = ["kort", "gemiddeld", "lang"] as const;
export type Bovenlichaam = (typeof BOVENLICHAAM_LENGTES)[number];

export interface LidaGrenzen {
  /** Zandloper: taille hooguit dit deel van de grootste van borst en heup (Lida: 25% kleiner = 0,75). */
  zandloperTailleMax: number;
  /** Heupen voller: heup minstens zoveel groter dan de borst (0,08 = 8%). VOORSTEL. */
  heupBredMin: number;
  /** Borst voller: borst minstens zoveel groter dan de heup (0,08 = 8%). VOORSTEL. */
  borstBredMin: number;
  /** Lepel: hoge heup minstens dit deel van de lage heup (het "plankje"). VOORSTEL. */
  lepelHogeHeupMin: number;
  /** Peer: hoge heup hooguit dit deel van de lage heup (ronde overgang). VOORSTEL. */
  peerHogeHeupMax: number;
}

export const LIDA_GRENZEN_STANDAARD: LidaGrenzen = {
  zandloperTailleMax: 0.75,
  // 8%: zo blijft Lida's voorbeeld a (borst 94, heup 101, "kan goed zijn" als H) een H,
  // en wordt voorbeeld c (borst 95, heup 103, rechte heup) een Lepel.
  heupBredMin: 0.08,
  borstBredMin: 0.08,
  lepelHogeHeupMin: 0.95,
  peerHogeHeupMax: 0.9,
};

/** Toegestane waarden per grens (als fractie), voor de invoer in het beheer. */
export const LIDA_GRENZEN_BEREIK: Record<keyof LidaGrenzen, { min: number; max: number }> = {
  zandloperTailleMax: { min: 0.5, max: 0.95 },
  heupBredMin: { min: 0, max: 0.4 },
  borstBredMin: { min: 0, max: 0.4 },
  lepelHogeHeupMin: { min: 0.7, max: 1.05 },
  peerHogeHeupMax: { min: 0.6, max: 1 },
};

/** Schouderbreedte (cm), gemeten op de rug van schouderpunt tot schouderpunt. */
export const SCHOUDERBREEDTE_GRENZEN = { min: 25, max: 60 } as const;
