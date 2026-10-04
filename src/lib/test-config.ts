// Configuratie voor de test-UI. Teksten en beeldverwijzingen zijn placeholders
// (OPEN-punt #7: definitieve afbeeldingen, meetinstructie-video's en pasvormvragen
// volgen). Alles staat hier zodat het zonder codewijziging aangepast kan worden.


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
    label: "Schouderomvang",
    instructie:
      "Dit is het lastigste om zelf te doen — vraag iemand je te helpen. Leg het meetlint op het puntje van je schouder (niet op het dikste deel van je arm) en wikkel het om je schouders, zoals bij een sjaal. Leg het zo hoog mogelijk, tot het er bijna afglijdt.",
    verplicht: false,
    controle: false,
  },
  {
    sleutel: "borst",
    label: "Borstomvang",
    instructie:
      "Draag je best zittende beha en sta rechtop. Leg het meetlint horizontaal (evenwijdig aan de vloer) rond het dikste punt van je borst, meestal op tepelhoogte. Trek het strak, maar niet zó strak dat je borsten indeuken.",
    verplicht: true,
    controle: true,
  },
  {
    sleutel: "taille",
    label: "Tailleomvang",
    instructie:
      "Meet rond het smalste deel van je natuurlijke taille — meestal het punt waar je lichaam knikt als je opzij helt. Begin bij je navel en eindig daar ook. Trek je buik niet in.",
    verplicht: true,
    controle: true,
  },
  {
    sleutel: "hoge_heup",
    label: "Hoge heupomvang",
    instructie:
      "Meet rond je bovenste heup, net onder je taille, ongeveer ter hoogte van je heupbeenderen. Houd het meetlint horizontaal.",
    verplicht: true,
    controle: true,
  },
  {
    sleutel: "heup",
    label: "Heupomvang",
    instructie:
      "Leg het meetlint horizontaal rond het dikste deel van je heupen en zitvlak — meestal ter hoogte van je polsen als je armen langs je lichaam hangen.",
    verplicht: true,
    controle: true,
  },
  {
    sleutel: "binnenbeen",
    label: "Binnenbeenlengte (optioneel)",
    instructie: "Meet van je kruis recht naar beneden tot aan de vloer, aan de binnenkant van je been.",
    verplicht: false,
    controle: false,
  },
];

export type MaatSleutel = MaatVeld["sleutel"];

/** Indeling van de maten over de tabbladen van de test (van boven naar beneden). */
export const MAAT_GROEPEN: { titel: string; velden: MaatSleutel[] }[] = [
  { titel: "Bovenlichaam", velden: ["schouder", "borst"] },
  { titel: "Taille", velden: ["taille", "hoge_heup"] },
  { titel: "Heupen en benen", velden: ["heup", "binnenbeen"] },
];

/** Halve breedtes (px in de illustratie) van een lichaamsvorm. */
export interface Lichaamsvorm {
  schouder: number;
  borst: number;
  taille: number;
  hogeHeup: number;
  heup: number;
}

// Algemene meettip (getoond bij stap 2). Uit "Tips voor Stijladvies op afstand".
export const MEET_TIP =
  "Neem een meetlint en vraag een huisgenoot of vriend(in) om je te helpen — zelf nauwkeurig meten is lastig. Hoe nauwkeuriger je meet, hoe beter we je figuurtype kunnen bepalen.";

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
