// Gedeelde types en grenzen voor de mail-editor (browser én server).

import type { Blok } from "@/lib/nieuwsbrief/blokken";
import type { Doelgroep } from "@/lib/nieuwsbrief/doelgroep";
import type { Trigger } from "@/lib/nieuwsbrief/sjablonen";

export interface MailInhoud {
  naam: string;
  onderwerp: string;
  preheader: string;
  blokken: Blok[];
  doelgroep: Doelgroep;
  trigger: Trigger | null;
  vertraging_dagen: number;
}

export const LIMIETEN = { naam: 120, onderwerp: 150, preheader: 200 } as const;

export const BUCKET = "nieuwsbrief";
export const AFBEELDING_MAX_BYTES = 5 * 1024 * 1024;
export const AFBEELDING_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};

/** Een figuurtype voor de doelgroepkiezer. */
export interface TypeKeuze {
  letter: string;
  naam: string;
}
