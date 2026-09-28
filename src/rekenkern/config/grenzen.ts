// Configuratie D: plausibiliteitsgrenzen voor de maten (in cm). Configureerbaar.

export const MAAT_GRENZEN = {
  // Harde grenzen per maatsoort.
  omtrekMin: 50,
  omtrekMax: 200,
  binnenbeenMin: 55,
  binnenbeenMax: 100,
  // Maximaal toegestaan verschil tussen eerste meting en controlemeting.
  controleVerschilMax: 2,
  // Logische checks.
  hogeHeupBovenHeupMarge: 3, // hoge heup > heup + 3 -> melding
  heupOnderTailleMarge: 5, // heup < taille - 5 -> melding
} as const;
