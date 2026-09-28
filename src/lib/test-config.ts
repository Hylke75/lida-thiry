// Configuratie voor de test-UI. Teksten en beeldverwijzingen zijn placeholders
// (OPEN-punt #7: definitieve afbeeldingen, meetinstructie-video's en pasvormvragen
// volgen). Alles staat hier zodat het zonder codewijziging aangepast kan worden.

import type { Figuurletter } from "@/rekenkern/config/ffit-naar-letter";

export interface MaatVeld {
  sleutel: "borst" | "taille" | "hoge_heup" | "heup" | "binnenbeen" | "schouder";
  label: string;
  instructie: string;
  verplicht: boolean;
  /** Vraagt om een tweede controlemeting. */
  controle: boolean;
}

export const MAAT_VELDEN: MaatVeld[] = [
  {
    sleutel: "schouder",
    label: "Schouderbreedte",
    instructie:
      "Meet van schoudertop tot schoudertop over je rug. (OPEN: schouderbreedte of -omvang wordt nog vastgesteld.)",
    verplicht: false,
    controle: false,
  },
  {
    sleutel: "borst",
    label: "Borstomvang",
    instructie: "Meet rond het volste deel van je borst, de meetlint horizontaal.",
    verplicht: true,
    controle: true,
  },
  {
    sleutel: "taille",
    label: "Tailleomvang",
    instructie: "Meet rond het smalste deel van je middel.",
    verplicht: true,
    controle: true,
  },
  {
    sleutel: "hoge_heup",
    label: "Hoge heupomvang",
    instructie: "Meet rond je bovenste heup, ongeveer ter hoogte van je heupbeenderen.",
    verplicht: true,
    controle: true,
  },
  {
    sleutel: "heup",
    label: "Heupomvang",
    instructie: "Meet rond het volste deel van je heupen en zitvlak.",
    verplicht: true,
    controle: true,
  },
  {
    sleutel: "binnenbeen",
    label: "Binnenbeenlengte (optioneel)",
    instructie: "Meet van je kruis tot de vloer, aan de binnenkant van je been.",
    verplicht: false,
    controle: false,
  },
];

export interface SilhouetOptie {
  letter: Figuurletter;
  naam: string;
  omschrijving: string;
  /** Placeholder-afbeelding; definitieve silhouetten volgen. */
  afbeelding: string | null;
}

export const SILHOUETTEN: SilhouetOptie[] = [
  { letter: "X", naam: "Zandloper", omschrijving: "Schouders en heupen in balans, duidelijke taille.", afbeelding: null },
  { letter: "A", naam: "Peer / driehoek", omschrijving: "Heupen breder dan schouders.", afbeelding: null },
  { letter: "V", naam: "Omgekeerde driehoek", omschrijving: "Schouders breder dan heupen.", afbeelding: null },
  { letter: "H", naam: "Rechthoek", omschrijving: "Weinig verschil tussen borst, taille en heup.", afbeelding: null },
  { letter: "8", naam: "De 8", omschrijving: "Voller silhouet met balans boven en onder.", afbeelding: null },
];

export interface Pasvormvraag {
  sleutel: string;
  vraag: string;
  opties: string[];
}

// Configureerbare pasvormvragen (placeholders).
export const PASVORMVRAGEN: Pasvormvraag[] = [
  {
    sleutel: "gewicht_erbij",
    vraag: "Waar komt er als eerste gewicht bij?",
    opties: ["Bovenlichaam", "Rond de taille", "Heupen en billen", "Gelijkmatig verdeeld"],
  },
  {
    sleutel: "taille_zichtbaar",
    vraag: "Hoe duidelijk is je taille zichtbaar?",
    opties: ["Heel duidelijk", "Een beetje", "Nauwelijks"],
  },
];
