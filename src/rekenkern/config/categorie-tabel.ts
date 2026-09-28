// Categorietabel A: 12 categorieen (3 lengtegroepen x 4 gewichtsklassen).
// Letterlijk overgenomen uit het aangeleverde schema. Alle grenswaarden staan hier,
// niet in de logica. Nummering = nummering van de adviesdocumenten.
//
// OPEN-punten (zie open-punten.ts): randgedrag onder/boven de grenzen, lang-plus bij
// 178-179 cm (aangenomen 100-113), en de brontypfout "175-1789" gelezen als 175-179.

import type { CategorieDefinitie } from "../types";

export const CATEGORIE_TABEL: CategorieDefinitie[] = [
  {
    nummer: 1,
    lengtegroep: "kort",
    klasse: "tenger",
    titel: "Kort – tenger",
    segmenten: [
      { lengteMin: 145, lengteMax: 149, gewichtMin: 41, gewichtMax: 44 },
      { lengteMin: 150, lengteMax: 151, gewichtMin: 41, gewichtMax: 47 },
      { lengteMin: 152, lengteMax: 156, gewichtMin: 41, gewichtMax: 49 },
      { lengteMin: 157, lengteMax: 159, gewichtMin: 41, gewichtMax: 51 },
    ],
  },
  {
    nummer: 2,
    lengtegroep: "kort",
    klasse: "gemiddeld",
    titel: "Kort – gemiddeld",
    segmenten: [
      { lengteMin: 145, lengteMax: 149, gewichtMin: 45, gewichtMax: 60 },
      { lengteMin: 150, lengteMax: 151, gewichtMin: 48, gewichtMax: 63 },
      { lengteMin: 152, lengteMax: 154, gewichtMin: 50, gewichtMax: 65 },
      { lengteMin: 155, lengteMax: 156, gewichtMin: 50, gewichtMax: 67 },
      { lengteMin: 157, lengteMax: 159, gewichtMin: 52, gewichtMax: 67 },
    ],
  },
  {
    nummer: 3,
    lengtegroep: "kort",
    klasse: "vol",
    titel: "Kort – vol",
    segmenten: [
      { lengteMin: 145, lengteMax: 149, gewichtMin: 61, gewichtMax: 69 },
      { lengteMin: 150, lengteMax: 151, gewichtMin: 64, gewichtMax: 72 },
      { lengteMin: 152, lengteMax: 154, gewichtMin: 66, gewichtMax: 74 },
      { lengteMin: 155, lengteMax: 156, gewichtMin: 68, gewichtMax: 76 },
      { lengteMin: 157, lengteMax: 159, gewichtMin: 68, gewichtMax: 78 },
    ],
  },
  {
    nummer: 4,
    lengtegroep: "kort",
    klasse: "plus",
    titel: "Kort – plus",
    segmenten: [
      { lengteMin: 145, lengteMax: 146, gewichtMin: 70, gewichtMax: 85 },
      { lengteMin: 147, lengteMax: 149, gewichtMin: 70, gewichtMax: 87 },
      { lengteMin: 150, lengteMax: 151, gewichtMin: 73, gewichtMax: 87 },
      { lengteMin: 152, lengteMax: 154, gewichtMin: 75, gewichtMax: 93 },
      { lengteMin: 155, lengteMax: 156, gewichtMin: 77, gewichtMax: 101 },
      { lengteMin: 157, lengteMax: 159, gewichtMin: 79, gewichtMax: 103 },
    ],
  },
  {
    nummer: 5,
    lengtegroep: "gemiddeld",
    klasse: "tenger",
    titel: "Gemiddeld – tenger",
    segmenten: [
      { lengteMin: 160, lengteMax: 162, gewichtMin: 41, gewichtMax: 51 },
      { lengteMin: 163, lengteMax: 164, gewichtMin: 41, gewichtMax: 53 },
      { lengteMin: 165, lengteMax: 167, gewichtMin: 43, gewichtMax: 53 },
      { lengteMin: 168, lengteMax: 169, gewichtMin: 45, gewichtMax: 56 },
      { lengteMin: 170, lengteMax: 172, gewichtMin: 48, gewichtMax: 58 },
    ],
  },
  {
    nummer: 6,
    lengtegroep: "gemiddeld",
    klasse: "gemiddeld",
    titel: "Gemiddeld – gemiddeld",
    segmenten: [
      { lengteMin: 160, lengteMax: 162, gewichtMin: 52, gewichtMax: 69 },
      { lengteMin: 163, lengteMax: 164, gewichtMin: 54, gewichtMax: 72 },
      { lengteMin: 165, lengteMax: 167, gewichtMin: 54, gewichtMax: 74 },
      { lengteMin: 168, lengteMax: 169, gewichtMin: 57, gewichtMax: 76 },
      { lengteMin: 170, lengteMax: 172, gewichtMin: 59, gewichtMax: 78 },
    ],
  },
  {
    nummer: 7,
    lengtegroep: "gemiddeld",
    klasse: "vol",
    titel: "Gemiddeld – vol",
    segmenten: [
      { lengteMin: 160, lengteMax: 162, gewichtMin: 70, gewichtMax: 81 },
      { lengteMin: 163, lengteMax: 164, gewichtMin: 73, gewichtMax: 83 },
      { lengteMin: 165, lengteMax: 167, gewichtMin: 75, gewichtMax: 85 },
      { lengteMin: 168, lengteMax: 169, gewichtMin: 77, gewichtMax: 87 },
      { lengteMin: 170, lengteMax: 172, gewichtMin: 79, gewichtMax: 90 },
    ],
  },
  {
    nummer: 8,
    lengtegroep: "gemiddeld",
    klasse: "plus",
    titel: "Gemiddeld – plus",
    segmenten: [
      { lengteMin: 160, lengteMax: 162, gewichtMin: 82, gewichtMax: 106 },
      { lengteMin: 163, lengteMax: 164, gewichtMin: 84, gewichtMax: 110 },
      { lengteMin: 165, lengteMax: 167, gewichtMin: 86, gewichtMax: 112 },
      { lengteMin: 168, lengteMax: 169, gewichtMin: 88, gewichtMax: 115 },
      { lengteMin: 170, lengteMax: 172, gewichtMin: 91, gewichtMax: 115 },
    ],
  },
  {
    nummer: 9,
    lengtegroep: "lang",
    klasse: "tenger",
    titel: "Lang – tenger",
    segmenten: [
      { lengteMin: 173, lengteMax: 174, gewichtMin: 50, gewichtMax: 60 },
      { lengteMin: 175, lengteMax: 179, gewichtMin: 52, gewichtMax: 63 },
      { lengteMin: 180, lengteMax: 182, gewichtMin: 54, gewichtMax: 65 },
      { lengteMin: 183, lengteMax: Infinity, gewichtMin: 57, gewichtMax: 67 },
    ],
  },
  {
    nummer: 10,
    lengtegroep: "lang",
    klasse: "gemiddeld",
    titel: "Lang – gemiddeld",
    segmenten: [
      { lengteMin: 173, lengteMax: 174, gewichtMin: 61, gewichtMax: 78 },
      { lengteMin: 175, lengteMax: 177, gewichtMin: 64, gewichtMax: 81 },
      { lengteMin: 178, lengteMax: 179, gewichtMin: 64, gewichtMax: 85 },
      { lengteMin: 180, lengteMax: 182, gewichtMin: 66, gewichtMax: 87 },
      { lengteMin: 183, lengteMax: Infinity, gewichtMin: 68, gewichtMax: 87 },
    ],
  },
  {
    nummer: 11,
    lengtegroep: "lang",
    klasse: "vol",
    titel: "Lang – vol",
    segmenten: [
      { lengteMin: 173, lengteMax: 174, gewichtMin: 79, gewichtMax: 92 },
      { lengteMin: 175, lengteMax: 177, gewichtMin: 82, gewichtMax: 94 },
      { lengteMin: 178, lengteMax: 179, gewichtMin: 86, gewichtMax: 99 },
      { lengteMin: 180, lengteMax: 182, gewichtMin: 88, gewichtMax: 99 },
      { lengteMin: 183, lengteMax: Infinity, gewichtMin: 88, gewichtMax: 103 },
    ],
  },
  {
    nummer: 12,
    lengtegroep: "lang",
    klasse: "plus",
    titel: "Lang – plus",
    segmenten: [
      { lengteMin: 173, lengteMax: 174, gewichtMin: 93, gewichtMax: 113 },
      { lengteMin: 175, lengteMax: 177, gewichtMin: 95, gewichtMax: 113 },
      // OPEN: 178-179 aangenomen als 100-113 (bron dubbelzinnig).
      { lengteMin: 178, lengteMax: 182, gewichtMin: 100, gewichtMax: 113 },
      { lengteMin: 183, lengteMax: Infinity, gewichtMin: 104, gewichtMax: 113 },
    ],
  },
];

// Grenswaarden voor de lengtegroep-indeling (configureerbaar).
export const LENGTEGROEP_GRENZEN = {
  // t/m deze lengte = kort; daarboven t/m gemiddeldMax = gemiddeld; daarboven = lang.
  kortMax: 159,
  gemiddeldMax: 172,
} as const;
