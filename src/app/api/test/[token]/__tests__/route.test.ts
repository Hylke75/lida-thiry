import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---------------------------------------------------------------
const db = vi.hoisted(() => ({
  calls: [] as { table: string; op: string; args: unknown[] }[],
  rpc: vi.fn(),
  upsertError: null as unknown,
  updateRows: [{ id: "order-1" }] as { id: string }[],
}));

vi.mock("@/lib/supabase/admin", () => {
  function builder(table: string) {
    let op = "select";
    const b: Record<string, unknown> = {};
    const chain = (naam: string) =>
      (...args: unknown[]) => {
        if (["upsert", "update", "insert", "delete"].includes(naam)) op = naam;
        db.calls.push({ table, op: naam, args });
        return b;
      };
    for (const naam of ["select", "eq", "upsert", "update", "insert", "delete", "single", "maybeSingle"]) {
      b[naam] = chain(naam);
    }
    b.then = (resolve: (v: unknown) => unknown) => {
      if (op === "upsert") return resolve({ data: null, error: db.upsertError });
      if (op === "update") return resolve({ data: db.updateRows, error: null });
      return resolve({ data: null, error: null });
    };
    return b;
  }
  return {
    adminClient: () => ({
      from: (table: string) => builder(table),
      rpc: db.rpc,
    }),
  };
});

const beoordeelToken = vi.hoisted(() => vi.fn());
const haalVerfijning = vi.hoisted(() => vi.fn());
vi.mock("@/lib/lichaamstypes", async () => {
  const { FFIT_NAAR_LETTER } = await import("@/rekenkern/config/ffit-naar-letter");
  const vorm = { schouder: 36, borst: 34, taille: 27, hogeHeup: 32, heup: 37 };
  const namen: [string, string][] = [["X", "Zandloper"], ["A", "Peer / driehoek"], ["V", "Omgekeerde driehoek"], ["H", "Rechthoek"], ["8", "De 8"]];
  return {
    haalSilhouetten: vi.fn().mockResolvedValue(
      namen.map(([letter, naam]) => ({ letter, naam, alias: null, omschrijving: "", uitleg: "", kenmerken: [], vorm, beeldUrl: null })),
    ),
    haalFfitToewijzing: vi.fn().mockResolvedValue({ ...FFIT_NAAR_LETTER }),
    haalVerfijning,
  };
});
vi.mock("@/lib/test-order", () => ({
  beoordeelToken,
  haalTypeTitel: vi.fn().mockResolvedValue("Testtitel"),
}));

const leverAdvies = vi.hoisted(() => vi.fn());
vi.mock("@/lib/advies-leveren", () => ({ leverAdvies }));

vi.mock("@/lib/instellingen", () => ({
  leesInstelling: vi.fn(async (sleutel: string) => (sleutel === "zandloper_variant" ? "excel" : null)),
}));

import { POST } from "../route";

// --- Helpers -------------------------------------------------------------
const ORDER = {
  id: "order-1",
  klantnaam: "Test Klant",
  email: "klant@example.com",
  status: "betaald",
  token_verloopt_op: null,
  toegekend_type: null,
};

// Onderste zandloper -> letter 8, categorie 6 => "68" (zie test-verwerking.test.ts).
function geldigeBody(overrides: Record<string, unknown> = {}) {
  return {
    lengte_cm: 172,
    gewicht_kg: 63,
    maten: { borst: 92, taille: 79, hoge_heup: 93, heup: 103 },
    controlemetingen: { borst: 92, taille: 79, hoge_heup: 93, heup: 103 },
    gekozen_silhouet: "8",
    pasvormantwoorden: {},
    hermeting: false,
    ...overrides,
  };
}

function verzoek(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/test/abc", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.7", ...headers },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ token: "abc" }) };

beforeEach(() => {
  db.calls = [];
  db.upsertError = null;
  db.updateRows = [{ id: "order-1" }];
  db.rpc.mockReset().mockResolvedValue({ data: true, error: null });
  beoordeelToken.mockReset().mockResolvedValue({ toestand: "geldig", order: ORDER });
  leverAdvies.mockReset().mockResolvedValue(true);
  haalVerfijning.mockReset().mockResolvedValue({ aan: false, beschikbaar: [] });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// --- Tests ---------------------------------------------------------------
describe("POST /api/test/[token]", () => {
  it("verwerkt een geldige inzending tot een definitief type", async () => {
    const res = await POST(verzoek(geldigeBody()), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ soort: "type", sleutel: "68", pdfKlaar: true });
    expect(json).not.toHaveProperty("letter");

    const upsert = db.calls.find((c) => c.table === "testresultaten" && c.op === "upsert");
    expect(upsert?.args[0]).toMatchObject({ order_id: "order-1", letter: "8", borst: 92 });
    const update = db.calls.find((c) => c.table === "orders" && c.op === "update");
    expect(update?.args[0]).toMatchObject({ status: "test_afgerond", toegekend_type: "68" });
    // Eerst de statusovergang, dan pas het resultaat opslaan.
    expect(db.calls.indexOf(update!)).toBeLessThan(db.calls.indexOf(upsert!));
    expect(leverAdvies).toHaveBeenCalledWith("order-1");
  });

  it("weigert een schoudermaat buiten het bereik met 400", async () => {
    const body = geldigeBody();
    const res = await POST(verzoek({ ...body, maten: { ...body.maten, schouder: 400 } }), ctx);
    expect(res.status).toBe(400);
    expect(db.calls.some((c) => c.op === "update" || c.op === "upsert")).toBe(false);
  });

  it("zet de order terug op betaald als opslaan mislukt", async () => {
    db.upsertError = { message: "db weg" };
    const res = await POST(verzoek(geldigeBody()), ctx);
    expect(res.status).toBe(500);
    const updates = db.calls.filter((c) => c.table === "orders" && c.op === "update");
    expect(updates[1]?.args[0]).toMatchObject({ status: "betaald", toegekend_type: null });
    expect(leverAdvies).not.toHaveBeenCalled();
  });

  it("bewaart alleen pasvormantwoorden op bestaande vragen en opties", async () => {
    const res = await POST(
      verzoek(
        geldigeBody({
          pasvormantwoorden: {
            gewicht_erbij: "Rond de taille",
            taille_zichtbaar: "Verzonnen optie",
            onbekende_vraag: "Bovenlichaam",
          },
        }),
      ),
      ctx,
    );
    expect(res.status).toBe(200);
    const upsert = db.calls.find((c) => c.table === "testresultaten" && c.op === "upsert");
    expect((upsert?.args[0] as { pasvormantwoorden: unknown }).pasvormantwoorden).toEqual({
      gewicht_erbij: "Rond de taille",
    });
  });

  it("weigert een onmogelijke lengte met 400", async () => {
    const res = await POST(verzoek(geldigeBody({ lengte_cm: 20 })), ctx);
    expect(res.status).toBe(400);
    expect((await res.json()).fout).toBeTruthy();
    expect(db.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("weigert een ontbrekende/ongeldige lengte met 400", async () => {
    const res = await POST(verzoek(geldigeBody({ lengte_cm: "abc" })), ctx);
    expect(res.status).toBe(400);
  });

  it("weigert een onbekend silhouet met 400", async () => {
    const res = await POST(verzoek(geldigeBody({ gekozen_silhouet: "Q" })), ctx);
    expect(res.status).toBe(400);
    expect(db.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("geeft bij een al afgeronde order het opgeslagen resultaat terug", async () => {
    beoordeelToken.mockResolvedValue({
      toestand: "al_afgerond",
      order: { ...ORDER, status: "advies_verzonden", toegekend_type: "6X" },
    });
    const res = await POST(verzoek(geldigeBody()), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ soort: "type", sleutel: "6X" });
    expect(db.calls).toHaveLength(0);
    expect(leverAdvies).not.toHaveBeenCalled();
  });

  it("vraagt bij een silhouetverschil eerst om hermeting en slaat niets op", async () => {
    const res = await POST(verzoek(geldigeBody({ gekozen_silhouet: "X" })), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ soort: "silhouet_verschil", berekendeLetter: "8" });
    expect(db.calls).toHaveLength(0);
  });

  it("geeft na hermeting toch het berekende type", async () => {
    const res = await POST(verzoek(geldigeBody({ gekozen_silhouet: "X", hermeting: true })), ctx);
    expect(await res.json()).toMatchObject({ soort: "type", sleutel: "68" });
  });

  it("levert geen tweede advies bij een dubbele verzending", async () => {
    db.updateRows = [];
    const res = await POST(verzoek(geldigeBody()), ctx);
    expect(await res.json()).toMatchObject({ soort: "type", sleutel: "68" });
    expect(leverAdvies).not.toHaveBeenCalled();
    // Het verliezende verzoek overschrijft het opgeslagen resultaat niet.
    expect(db.calls.some((c) => c.op === "upsert")).toBe(false);
  });

  it("weigert een ongeldige token met 403", async () => {
    beoordeelToken.mockResolvedValue({ toestand: "onbekend" });
    const res = await POST(verzoek(geldigeBody()), ctx);
    expect(res.status).toBe(403);
  });

  it("geeft 429 als de rate limit bereikt is", async () => {
    db.rpc.mockResolvedValue({ data: false, error: null });
    const res = await POST(verzoek(geldigeBody()), ctx);
    expect(res.status).toBe(429);
    expect(beoordeelToken).not.toHaveBeenCalled();
    const [naam, args] = db.rpc.mock.calls[0];
    expect(naam).toBe("rate_limit_hit");
    expect(args.p_sleutel).toMatch(/^test:[0-9a-f]{64}$/);
    expect(args.p_sleutel).not.toContain("203.0.113.7");
  });

  it("laat verzoeken door als de rate limit-controle faalt (fail open)", async () => {
    db.rpc.mockResolvedValue({ data: null, error: { message: "db weg" } });
    const res = await POST(verzoek(geldigeBody()), ctx);
    expect(res.status).toBe(200);
  });

  describe("bandmaat en extra figuurtypes I en O", () => {
    // Rechthoek (H): categorie 6.
    const recht = { borst: 84, taille: 72, hoge_heup: 82, heup: 86 };
    const body = (extra: Record<string, unknown>) =>
      geldigeBody({ maten: recht, controlemetingen: recht, gekozen_silhouet: "H", ...extra });

    it("weigert een bandmaat buiten 60–120 met 400", async () => {
      for (const b of [59, 121]) {
        const res = await POST(verzoek(body({ behamaat_band: b })), ctx);
        expect(res.status).toBe(400);
      }
      expect(db.calls.some((c) => c.op === "update" || c.op === "upsert")).toBe(false);
    });

    it("schakelaar uit: bandmaat telt niet mee en wordt niet bewaard", async () => {
      const res = await POST(verzoek(body({ behamaat_band: 65 })), ctx);
      expect(await res.json()).toMatchObject({ soort: "type", sleutel: "6H" });
      const upsert = db.calls.find((c) => c.table === "testresultaten" && c.op === "upsert");
      expect(upsert?.args[0]).not.toHaveProperty("behamaat_band");
    });

    it("schakelaar aan en I beschikbaar: H met bandmaat 70 wordt I en de bandmaat wordt bewaard", async () => {
      haalVerfijning.mockResolvedValue({ aan: true, beschikbaar: ["I", "O"] });
      const res = await POST(verzoek(body({ behamaat_band: 70, hermeting: true })), ctx);
      expect(await res.json()).toMatchObject({ soort: "type", sleutel: "6I" });
      const upsert = db.calls.find((c) => c.table === "testresultaten" && c.op === "upsert");
      expect(upsert?.args[0]).toMatchObject({ behamaat_band: 70, letter: "I" });
    });

    it("schakelaar aan maar I niet beschikbaar: blijft H", async () => {
      haalVerfijning.mockResolvedValue({ aan: true, beschikbaar: [] });
      const res = await POST(verzoek(body({ behamaat_band: 70 })), ctx);
      expect(await res.json()).toMatchObject({ soort: "type", sleutel: "6H" });
    });
  });
});
