// Gedeelde resultaattypes voor (server)acties: gelukt met extra velden, of mislukt
// met een foutmelding die de gebruiker te zien krijgt.

/** Gelukt (met de velden uit T) of mislukt met één foutmelding. */
export type Uitkomst<T = object> = ({ ok: true } & T) | { ok: false; fout: string };

/** Gelukt (met de velden uit T) of mislukt met een lijst foutmeldingen (formulieren). */
export type FormulierUitkomst<T = object> = ({ ok: true } & T) | { ok: false; fouten: string[] };
