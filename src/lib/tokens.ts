import "server-only";
import { randomBytes } from "node:crypto";

/** Genereert een niet-raadbare testtoken voor de unieke testlink. */
export function maakTesttoken(): string {
  return randomBytes(24).toString("base64url");
}

/** Vervaldatum van de testlink op basis van het aantal dagen. */
export function tokenVerlooptOp(dagen: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dagen);
  return d.toISOString();
}
