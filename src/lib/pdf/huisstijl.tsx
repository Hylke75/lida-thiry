// Gedeelde huisstijl voor de PDF's (advies, cadeaubon, factuur): de lettertypen,
// het woordmerk en de kleurstrook. Zie docs/ontwerp/HUISSTIJL-HANDBOEK.md.

import path from "node:path";
import { Font, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { KLEUR, STROOK, type Merk } from "@/lib/huisstijl";

export { KLEUR, STROOK, MERK_STANDAARD, type Merk } from "@/lib/huisstijl";

/** Koppen (handboek §5). */
export const SERIF = "DM Serif Display";
/** Lopende tekst en het woordmerk. */
export const SANS = "Manrope";

/**
 * De lettertypen staan als TTF in src/lib/pdf/fonts (SIL Open Font License, zie
 * de OFL-bestanden daar). Gelezen vanaf process.cwd(): op Vercel is dat de
 * functiemap; next.config.ts (outputFileTracingIncludes) neemt de map mee in de
 * functies die PDF's maken.
 */
const MAP = path.join(process.cwd(), "src", "lib", "pdf", "fonts");

/** Registreert de lettertypen (gebeurt bij het laden van deze module; daarna een no-op). */
let geregistreerd = false;
export function registreerLettertypen(): void {
  if (geregistreerd) return;
  geregistreerd = true;
  Font.register({
    family: SANS,
    fonts: [
      { src: path.join(MAP, "Manrope-Regular.ttf"), fontWeight: 400 },
      { src: path.join(MAP, "Manrope-SemiBold.ttf"), fontWeight: 600 },
      { src: path.join(MAP, "Manrope-Bold.ttf"), fontWeight: 700 },
    ],
  });
  Font.register({
    family: SERIF,
    fonts: [
      { src: path.join(MAP, "DMSerifDisplay-Regular.ttf"), fontWeight: 400 },
      { src: path.join(MAP, "DMSerifDisplay-Italic.ttf"), fontWeight: 400, fontStyle: "italic" },
    ],
  });
  // Geen automatische woordafbreking: die volgt Engelse regels ("kledin-gadvies").
  Font.registerHyphenationCallback((woord) => [woord]);
}

registreerLettertypen();

/** De vijf kleurbanen naast elkaar (coral, butter, sage, sky, lilac). */
export function Kleurstrook({ hoogte = 6, style, fixed }: { hoogte?: number; style?: Style; fixed?: boolean }) {
  return (
    <View style={[{ flexDirection: "row", height: hoogte }, style ?? {}]} fixed={fixed}>
      {STROOK.map((k) => (
        <View key={k} style={{ flex: 1, backgroundColor: k }} />
      ))}
    </View>
  );
}

/**
 * Het typografische woordmerk (handboek §3): de naam vet in kapitalen, daaronder
 * een kleine regel met ruime spatiëring, in donker aubergine.
 */
export function Woordmerk({
  merk,
  grootte = 15,
  midden = false,
}: {
  merk: Merk;
  /** Korpsgrootte van de naam; de subregel schaalt mee. */
  grootte?: number;
  midden?: boolean;
}) {
  return (
    <View style={{ alignItems: midden ? "center" : "flex-start" }}>
      <Text
        style={{
          fontFamily: SANS,
          fontWeight: 700,
          fontSize: grootte,
          letterSpacing: grootte * 0.045,
          textTransform: "uppercase",
          color: KLEUR.ink,
          lineHeight: 1,
        }}
      >
        {merk.naam}
      </Text>
      {merk.subregel ? (
        <Text
          style={{
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: grootte * 0.42,
            letterSpacing: grootte * 0.42 * 0.22,
            textTransform: "uppercase",
            color: KLEUR.inkZacht,
            marginTop: grootte * 0.3,
            lineHeight: 1,
          }}
        >
          {merk.subregel}
        </Text>
      ) : null}
    </View>
  );
}

/** Kleine kapitalen boven een blok (handboek: eyebrow, 0.13em spatiëring). */
export const EYEBROW: Style = {
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: 7.5,
  letterSpacing: 1.1,
  textTransform: "uppercase",
  color: KLEUR.berry,
};
