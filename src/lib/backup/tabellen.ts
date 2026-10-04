// Tabellen in de back-up, in de volgorde waarin ze terug te zetten zijn (eerst de
// tabellen waar andere naar verwijzen). Opgesteld uit supabase/migrations; komt
// er een tabel bij, voeg hem hier toe (de test controleert dat elke tabel uit de
// migraties hier staat of bewust is overgeslagen).

export interface BackupTabel {
  naam: string;
  /** Primaire sleutel (voor sorteren en upsert bij terugzetten). */
  sleutel: readonly string[];
  /** Kolom `id` is "generated always as identity": bij terugzetten weglaten. */
  identiteit?: boolean;
  /**
   * Kolommen die naar een tabel verderop verwijzen (kringverwijzing): eerst leeg
   * terugzetten, daarna invullen.
   */
  uitgesteld?: readonly string[];
  /** Bevat persoonsgegevens van klanten/relaties (niet mee met --alleen-inhoud). */
  persoonsgegevens?: boolean;
  /** Niet terugzetten (bijv. verwijst naar auth.users van een ander project). */
  nietTerugzetten?: boolean;
}

const ID = ["id"] as const;

export const BACKUP_TABELLEN: readonly BackupTabel[] = [
  // Instellingen en inhoud --------------------------------------------------------
  { naam: "instellingen", sleutel: ["sleutel"] },
  { naam: "inhoud", sleutel: ["sleutel"] },
  { naam: "factuurteller", sleutel: ["jaar"] },
  // lichaamstypes.beeld_id → beelden, beelden.figuur → lichaamstypes: kringverwijzing.
  { naam: "lichaamstypes", sleutel: ["code"], uitgesteld: ["beeld_id"] },
  { naam: "beelden", sleutel: ID },
  { naam: "ffit_toewijzing", sleutel: ["ffit_type"] },
  { naam: "adviestypes", sleutel: ["sleutel"] },
  { naam: "advies_velden", sleutel: ["sleutel"] },
  { naam: "adviessecties", sleutel: ID },
  { naam: "sectie_beelden", sleutel: ["sectie_id", "volgorde"] },
  { naam: "meetinstructie_beelden", sleutel: ["maat_sleutel"] },
  { naam: "paginas", sleutel: ID },
  { naam: "media", sleutel: ID },
  { naam: "doorverwijzingen", sleutel: ID },
  { naam: "blog_berichten", sleutel: ID },
  { naam: "blog_ai_gebruik", sleutel: ID, identiteit: true },
  { naam: "versies", sleutel: ID },
  // Verkoop ------------------------------------------------------------------------
  { naam: "kortingscodes", sleutel: ID },
  { naam: "orders", sleutel: ID, persoonsgegevens: true },
  { naam: "testresultaten", sleutel: ID, persoonsgegevens: true },
  { naam: "cadeaubon_bestellingen", sleutel: ID, persoonsgegevens: true },
  { naam: "beoordelingen", sleutel: ID, persoonsgegevens: true },
  // Relaties en contact ----------------------------------------------------------
  { naam: "relaties", sleutel: ID, persoonsgegevens: true },
  { naam: "contact_berichten", sleutel: ID, persoonsgegevens: true },
  { naam: "contact_antwoorden", sleutel: ID, persoonsgegevens: true },
  // Afspraken ----------------------------------------------------------------------
  { naam: "afspraak_soorten", sleutel: ID },
  { naam: "beschikbaarheid", sleutel: ID },
  { naam: "afspraak_blokkades", sleutel: ID },
  { naam: "afspraken", sleutel: ID, persoonsgegevens: true },
  // Nieuwsbrief --------------------------------------------------------------------
  { naam: "nb_formulieren", sleutel: ID },
  { naam: "nb_contacten", sleutel: ID, persoonsgegevens: true },
  { naam: "nb_campagnes", sleutel: ID },
  { naam: "nb_verzendingen", sleutel: ID, persoonsgegevens: true },
  { naam: "nb_klikken", sleutel: ID, identiteit: true, persoonsgegevens: true },
  // Beheer -------------------------------------------------------------------------
  { naam: "beheerders", sleutel: ["gebruiker_id"], persoonsgegevens: true, nietTerugzetten: true },
  { naam: "beheer_log", sleutel: ID, identiteit: true, persoonsgegevens: true },
  { naam: "fouten_log", sleutel: ID },
];

/**
 * Tabellen uit de migraties die bewust NIET in de back-up zitten, met reden.
 */
export const NIET_IN_BACKUP: Readonly<Record<string, string>> = {
  rate_limits: "vluchtige tellers tegen misbruik; worden dagelijks opgeruimd",
  push_abonnementen: "sleutels van apparaten voor pushmeldingen; gekoppeld aan inloggegevens, opnieuw aanzetten per apparaat",
};

export const BACKUP_FORMAAT = "lida-thiry-backup";
export const BACKUP_VERSIE = 1;
export const PAGINA_GROOTTE = 1000;
