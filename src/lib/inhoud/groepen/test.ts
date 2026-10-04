// Beheerbare teksten van de test (de wizard op /test/[token] en de uitslag).
// De opbouw van de test (welke maten, verplicht, controlemeting, stappen) staat
// vast in src/lib/test-config.ts; de standaardteksten hier komen daar ook vandaan,
// zodat er één bron is.

import {
  MAAT_GROEPEN,
  MAAT_VELDEN,
  MEET_TIP,
  PASVORMVRAGEN,
  type MaatGroepSleutel,
  type MaatSleutel,
  type MaatVeld,
} from "../../test-config";
import { sectie, type Groep, type SectieWaarden, type TekstVeld, type TekstvakVeld } from "../schema";

const groepTitel = (s: MaatGroepSleutel) => MAAT_GROEPEN.find((g) => g.sleutel === s)!.titel;

const TITEL_UITLEG =
  "Kort houden: de titel staat ook op de knop naar deze stap (bijv. “Volgende: Over jou →”).";

export const TEST_ALGEMEEN = sectie({
  sleutel: "test.algemeen",
  titel: "Welkom",
  uitleg: "Boven elke stap van de test.",
  variabelen: { naam: "naam van de klant" },
  velden: {
    welkom: { soort: "tekst", label: "Welkomstregel", standaard: "Hoi {naam}, welkom bij je kledingadviestest." },
  },
});

export const TEST_OVER_JOU = sectie({
  sleutel: "test.over_jou",
  titel: "Stap: Over jou",
  velden: {
    titel: { soort: "tekst", label: "Titel van de stap", uitleg: TITEL_UITLEG, max: 40, standaard: "Over jou" },
    intro: {
      soort: "tekstvak",
      label: "Uitleg",
      regels: 3,
      standaard:
        "We beginnen eenvoudig. Met je lengte en gewicht bepalen we je categorie. Meet je lengte zonder schoenen, met je rug tegen een muur.",
    },
  },
});

export const TEST_METEN = sectie({
  sleutel: "test.meten",
  titel: "Stappen: opmeten",
  uitleg:
    "De drie stappen waarin de klant zich opmeet. Welke maten in welke stap staan, ligt vast. De namen en instructies per maat pas je aan bij “De metingen”.",
  velden: {
    tip: {
      soort: "tekstvak",
      label: "Meettip (bovenaan de eerste meetstap)",
      regels: 3,
      standaard: MEET_TIP,
    },
    titel_bovenlichaam: {
      soort: "tekst",
      label: "Titel stap 2",
      uitleg: TITEL_UITLEG,
      max: 40,
      standaard: groepTitel("bovenlichaam"),
    },
    titel_taille: { soort: "tekst", label: "Titel stap 3", max: 40, standaard: groepTitel("taille") },
    titel_heupen_benen: { soort: "tekst", label: "Titel stap 4", max: 40, standaard: groepTitel("heupen_benen") },
    twee_keer: {
      soort: "tekst",
      label: "Hint bij maten met een controlemeting",
      standaard: "Meet twee keer, zo weten we zeker dat de maat klopt.",
    },
  },
});

type MaatTekstVelden = { [K in MaatSleutel as `${K}_label`]: TekstVeld } & {
  [K in MaatSleutel as `${K}_instructie`]: TekstvakVeld;
};

function maatTekstVelden(): MaatTekstVelden {
  const velden: Record<string, TekstVeld | TekstvakVeld> = {};
  for (const v of MAAT_VELDEN) {
    velden[`${v.sleutel}_label`] = {
      soort: "tekst",
      label: `${v.label.replace(" (optioneel)", "")}: naam`,
      max: 60,
      standaard: v.label,
    };
    velden[`${v.sleutel}_instructie`] = {
      soort: "tekstvak",
      label: `${v.label.replace(" (optioneel)", "")}: meetinstructie`,
      regels: 4,
      max: 1_000,
      standaard: v.instructie,
    };
  }
  return velden as MaatTekstVelden;
}

export const TEST_MATEN = sectie({
  sleutel: "test.maten",
  titel: "De metingen",
  uitleg:
    "Naam en meetinstructie per maat. Of een maat verplicht is en of er een controlemeting wordt gevraagd, ligt vast. Laat “(optioneel)” in de naam staan bij maten die niet verplicht zijn; het wordt in de test vervangen door een los label.",
  velden: maatTekstVelden(),
});

export const TEST_SILHOUET = sectie({
  sleutel: "test.silhouet",
  titel: "Stap: Silhouet",
  uitleg: "De silhouetten zelf (naam, tekening, omschrijving) beheer je bij Lichaamstypes.",
  velden: {
    titel: { soort: "tekst", label: "Titel van de stap", uitleg: TITEL_UITLEG, max: 40, standaard: "Silhouet" },
    intro: {
      soort: "tekstvak",
      label: "Vraag boven de silhouetten",
      regels: 2,
      standaard:
        "Ga voor de spiegel staan. Welk silhouet lijkt het meest op het jouwe? Twijfel je, kies dan wat het dichtst in de buurt komt.",
    },
  },
});

export const TEST_VRAGEN = sectie({
  sleutel: "test.vragen",
  titel: "Stap: Vragen over je pasvorm",
  uitleg:
    "De klant moet elke vraag beantwoorden. Het antwoord wordt opgeslagen bij de vraag (niet bij de vraagtekst), dus een vraag herformuleren is veilig. Verwijder je een vraag, dan blijven eerdere antwoorden bewaard en zie je ze bij de bestelling onder hun oude sleutel.",
  velden: {
    titel: { soort: "tekst", label: "Titel van de stap", uitleg: TITEL_UITLEG, max: 40, standaard: "Vragen" },
    vragen: {
      soort: "lijst",
      label: "Vragen",
      itemNaam: "vraag",
      max: 12,
      velden: {
        vraag: { soort: "tekst", label: "Vraag", max: 200, standaard: "" },
        opties: {
          soort: "tekstvak",
          label: "Antwoordmogelijkheden (één per regel)",
          regels: 4,
          max: 1_000,
          standaard: "",
        },
      },
      standaard: PASVORMVRAGEN.map((q) => ({ _id: q.sleutel, vraag: q.vraag, opties: q.opties.join("\n") })),
    },
  },
});

export const TEST_AFRONDEN = sectie({
  sleutel: "test.afronden",
  titel: "Stap: Afronden",
  velden: {
    titel: { soort: "tekst", label: "Titel van de stap", uitleg: TITEL_UITLEG, max: 40, standaard: "Afronden" },
    intro: {
      soort: "opmaak",
      label: "Uitleg boven het overzicht",
      regels: 3,
      standaard:
        "Bijna klaar! Kijk je antwoorden nog even na. Klopt alles, klik dan op **Test afronden**. Je krijgt direct je type en je persoonlijke advies.",
    },
    knop: { soort: "tekst", label: "Knop om af te ronden", max: 40, standaard: "Test afronden" },
    bezig: {
      soort: "tekst",
      label: "Knoptekst tijdens het versturen",
      standaard: "Even geduld, je advies wordt gemaakt…",
    },
  },
});

export const TEST_UITSLAG = sectie({
  sleutel: "test.uitslag",
  titel: "Uitslag",
  uitleg:
    "Het scherm met het figuurtype, direct na de test en wanneer de klant de testlink later opnieuw opent. De uitleg over het type zelf beheer je bij Lichaamstypes en Adviestypes.",
  variabelen: { naam: "naam van de klant" },
  velden: {
    kop: { soort: "tekst", label: "Bovenschrift direct na de test", standaard: "Klaar, {naam}! Jouw type is" },
    intro: {
      soort: "tekstvak",
      label: "Introductie direct na de test",
      regels: 2,
      standaard:
        "Op basis van je maten en antwoorden hebben we je figuurtype bepaald. Hieronder lees je wat dat betekent.",
    },
    kop_terug: {
      soort: "tekst",
      label: "Bovenschrift bij later opnieuw openen",
      standaard: "Welkom terug, {naam}. Jouw type is",
    },
    intro_terug: {
      soort: "tekstvak",
      label: "Introductie bij later opnieuw openen",
      regels: 2,
      standaard:
        "Je hebt de test al afgerond. Hieronder zie je nog eens je uitslag en kun je je persoonlijke advies downloaden.",
    },
    silhouet_label: { soort: "tekst", label: "Label boven het silhouet", standaard: "Jouw silhouet" },
    download_knop: { soort: "tekst", label: "Downloadknop", max: 60, standaard: "Download je persoonlijke advies (PDF)" },
    download_uitleg: {
      soort: "tekstvak",
      label: "Uitleg onder de downloadknop",
      regels: 2,
      standaard:
        "In je advies lees je precies welke kleding, vormen en stoffen jouw figuur het mooist laten uitkomen. We sturen het ook naar je e-mail.",
    },
  },
});

export const TEST_MELDINGEN = sectie({
  sleutel: "test.meldingen",
  titel: "Meldingen bij de testlink",
  uitleg: "Wat de klant ziet als de testlink (nog) niet bruikbaar is.",
  velden: {
    onbekend_titel: { soort: "tekst", label: "Onbekende link: titel", standaard: "Testlink onbekend" },
    onbekend_tekst: {
      soort: "tekstvak",
      label: "Onbekende link: tekst",
      regels: 2,
      standaard: "We herkennen deze testlink niet. Controleer de link uit je e-mail.",
    },
    verlopen_titel: { soort: "tekst", label: "Verlopen link: titel", standaard: "Testlink verlopen" },
    verlopen_tekst: {
      soort: "tekstvak",
      label: "Verlopen link: tekst",
      regels: 2,
      standaard: "Deze testlink is verlopen. Neem contact op als je alsnog de test wilt doen.",
    },
    niet_betaald_titel: {
      soort: "tekst",
      label: "Nog niet betaald: titel",
      standaard: "Betaling nog niet afgerond",
    },
    niet_betaald_tekst: {
      soort: "tekstvak",
      label: "Nog niet betaald: tekst",
      regels: 2,
      standaard: "Zodra je betaling is bevestigd, kun je de test starten.",
    },
    afgerond_titel: {
      soort: "tekst",
      label: "Al afgerond (zonder type): titel",
      standaard: "Test al afgerond",
    },
    afgerond_tekst: {
      soort: "tekstvak",
      label: "Al afgerond (zonder type): tekst",
      regels: 2,
      standaard: "Je hebt de test al ingevuld. Je advies ontvang je per e-mail.",
    },
  },
});

export const TEST: Groep = {
  sleutel: "test",
  titel: "Test",
  omschrijving:
    "De teksten in de online test: stappen, meetinstructies, pasvormvragen, het afronden en de uitslag.",
  secties: [
    TEST_ALGEMEEN,
    TEST_OVER_JOU,
    TEST_METEN,
    TEST_MATEN,
    TEST_SILHOUET,
    TEST_VRAGEN,
    TEST_AFRONDEN,
    TEST_UITSLAG,
    TEST_MELDINGEN,
  ],
};

/** Alle teksten die de testwizard nodig heeft (op de server gelezen, als props doorgegeven). */
export interface TestTeksten {
  algemeen: SectieWaarden<typeof TEST_ALGEMEEN>;
  overJou: SectieWaarden<typeof TEST_OVER_JOU>;
  meten: SectieWaarden<typeof TEST_METEN>;
  maten: SectieWaarden<typeof TEST_MATEN>;
  silhouet: SectieWaarden<typeof TEST_SILHOUET>;
  vragen: SectieWaarden<typeof TEST_VRAGEN>;
  afronden: SectieWaarden<typeof TEST_AFRONDEN>;
  uitslag: SectieWaarden<typeof TEST_UITSLAG>;
}

/** De maatvelden uit de code, met de (aangepaste) naam en instructie. */
export function maatVeldenMetTeksten(maten: SectieWaarden<typeof TEST_MATEN>): MaatVeld[] {
  return MAAT_VELDEN.map((v) => ({
    ...v,
    label: maten[`${v.sleutel}_label`]?.trim() || v.label,
    instructie: maten[`${v.sleutel}_instructie`] ?? v.instructie,
  }));
}

/** Titel van een meetstap. */
export function meetStapTitel(meten: SectieWaarden<typeof TEST_METEN>, groep: MaatGroepSleutel): string {
  return meten[`titel_${groep}`]?.trim() || groepTitel(groep);
}

export interface PasvormVraag {
  /** Sleutel waaronder het antwoord wordt opgeslagen (de id van het item). */
  sleutel: string;
  vraag: string;
  opties: string[];
}

/** De pasvormvragen zoals de klant ze ziet; vragen zonder tekst of opties vallen weg. */
export function pasvormVragen(vragen: SectieWaarden<typeof TEST_VRAGEN>): PasvormVraag[] {
  return vragen.vragen
    .map((item) => ({
      sleutel: item._id,
      vraag: item.vraag.trim(),
      opties: [...new Set(item.opties.split("\n").map((o) => o.trim()).filter(Boolean))],
    }))
    .filter((q) => q.vraag && q.opties.length > 0);
}

/**
 * Houdt alleen antwoorden over op bestaande vragen met een bestaande optie.
 * Onbekende sleutels of waarden (bijv. een verouderde pagina) vallen weg.
 */
export function schoonPasvormAntwoorden(ruw: unknown, vragen: PasvormVraag[]): Record<string, string> {
  if (!ruw || typeof ruw !== "object" || Array.isArray(ruw)) return {};
  const bron = ruw as Record<string, unknown>;
  const uit: Record<string, string> = {};
  for (const q of vragen) {
    const w = bron[q.sleutel];
    if (typeof w === "string" && q.opties.includes(w)) uit[q.sleutel] = w;
  }
  return uit;
}
