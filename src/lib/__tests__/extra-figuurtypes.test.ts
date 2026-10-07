import { describe, expect, it } from "vitest";
import {
  EXTRA_FIGUURTYPES_SLEUTEL,
  beschikbareExtraTypes,
  extraFiguurtypesAan,
  extraTypeFouten,
  verfijningInstelling,
} from "../extra-figuurtypes";
import { INSTELLING_VELDEN } from "../instelling-velden";
import { PUBLIEKE_INSTELLINGEN } from "../cache/publieke-instellingen";
import { controleerLichaamstype } from "../lichaamstype-regels";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CAT = Array.from({ length: 12 }, (_, i) => i + 1);
const advies = (code: string, secties = 2, leeg?: number) =>
  CAT.map((c) => ({ sleutel: `${c}${code}`, secties: c === leeg ? 0 : secties }));

describe("schakelaar extra figuurtypes", () => {
  it("staat alleen aan bij precies 'aan'", () => {
    expect(extraFiguurtypesAan("aan")).toBe(true);
    expect(extraFiguurtypesAan(" Aan ")).toBe(true);
    for (const w of ["uit", "", null, undefined, "ja", "1"]) expect(extraFiguurtypesAan(w)).toBe(false);
  });

  it("is een keuze in de instellingen, standaard uit, en niet publiek", () => {
    expect(EXTRA_FIGUURTYPES_SLEUTEL).toBe("extra_figuurtypes_berekening");
    expect(INSTELLING_VELDEN[EXTRA_FIGUURTYPES_SLEUTEL]).toMatchObject({ soort: "keuze", standaard: "uit" });
    expect(PUBLIEKE_INSTELLINGEN).not.toContain(EXTRA_FIGUURTYPES_SLEUTEL);
  });
});

describe("beschikbaarheid van I en O", () => {
  const types = [
    { code: "I", naam: "I-silhouet", actief: true },
    { code: "O", naam: "O-silhouet", actief: false },
  ];

  it("vraagt een bestaand, actief type met 12 gevulde hand-outs", () => {
    expect(extraTypeFouten("I", types, advies("I"))).toEqual([]);
    expect(extraTypeFouten("I", types, advies("I", 2, 7))[0]).toContain("7I");
    expect(extraTypeFouten("I", types, advies("I").slice(0, 11))[0]).toContain("12I");
    expect(extraTypeFouten("O", types, advies("O"))[0]).toContain("gearchiveerd");
    expect(extraTypeFouten("O", [], [])[0]).toContain("bestaat niet");
  });

  it("geeft alleen de types die klaar zijn", () => {
    expect(beschikbareExtraTypes(types, [...advies("I"), ...advies("O")])).toEqual(["I"]);
    expect(beschikbareExtraTypes([], [])).toEqual([]);
  });

  it("de instelling voor de rekenkern is uit zolang de schakelaar uit staat", () => {
    const alles = [...advies("I"), ...advies("O")];
    const klaar = types.map((t) => ({ ...t, actief: true }));
    expect(verfijningInstelling("uit", klaar, alles)).toEqual({ aan: false, beschikbaar: [] });
    expect(verfijningInstelling(null, klaar, alles)).toEqual({ aan: false, beschikbaar: [] });
    expect(verfijningInstelling("aan", klaar, alles)).toEqual({ aan: true, beschikbaar: ["I", "O"] });
    expect(verfijningInstelling("aan", types, alles)).toEqual({ aan: true, beschikbaar: ["I"] });
  });
});

describe("migratie 20261007100000_figuurtypes_i_o", () => {
  const sql = readFileSync(
    join(__dirname, "..", "..", "..", "supabase", "migrations", "20261007100000_figuurtypes_i_o.sql"),
    "utf8",
  );

  it("voegt I en O niet actief toe, met een geldige tekening", () => {
    const vormen = [...sql.matchAll(/'(\{"schouder".*?\})', (\d+), (true|false)\)/g)];
    expect(vormen).toHaveLength(2);
    expect(vormen.map((v) => v[2])).toEqual(["6", "7"]);
    for (const v of vormen) {
      expect(v[3]).toBe("false");
      expect(controleerLichaamstype({ naam: "x", vorm: JSON.parse(v[1]) }, { nieuw: false, bestaandeCodes: [] })).toEqual([]);
    }
  });

  it("is idempotent en zet de schakelaar standaard uit", () => {
    expect(sql.match(/on conflict \((code|sleutel)\) do nothing/g)).toHaveLength(3);
    expect(sql).toContain("add column if not exists behamaat_band smallint");
    expect(sql).toMatch(/\('extra_figuurtypes_berekening', 'uit'/);
    expect(sql).toContain("behamaat_band = null");
  });
});
