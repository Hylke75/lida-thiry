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
vi.mock("@/lib/test-order", () => ({ beoordeelToken }));

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
  vi.spyOn(console, "error").mockImplementation(() => {});
});

// --- Tests ---------------------------------------------------------------
describe("POST /api/test/[token]", () => {
  it("verwerkt een geldige inzending tot een definitief type", async () => {
    const res = await POST(verzoek(geldigeBody()), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ soort: "type", sleutel: "68", pdfKlaar: true });

    const upsert = db.calls.find((c) => c.table === "testresultaten" && c.op === "upsert");
    expect(upsert?.args[0]).toMatchObject({ order_id: "order-1", letter: "8", borst: 92 });
    const update = db.calls.find((c) => c.table === "orders" && c.op === "update");
    expect(update?.args[0]).toMatchObject({ status: "test_afgerond", toegekend_type: "68" });
    expect(leverAdvies).toHaveBeenCalledWith("order-1");
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
    expect(await res.json()).toEqual({ soort: "type", sleutel: "6X" });
    expect(db.calls).toHaveLength(0);
    expect(leverAdvies).not.toHaveBeenCalled();
  });

  it("vraagt bij een silhouetverschil eerst om hermeting en slaat niets op", async () => {
    const res = await POST(verzoek(geldigeBody({ gekozen_silhouet: "X" })), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ soort: "silhouet_verschil" });
    expect(db.calls).toHaveLength(0);
  });

  it("geeft na hermeting toch het berekende type", async () => {
    const res = await POST(verzoek(geldigeBody({ gekozen_silhouet: "X", hermeting: true })), ctx);
    expect(await res.json()).toMatchObject({ soort: "type", sleutel: "68" });
  });

  it("levert geen tweede advies bij een dubbele verzending", async () => {
    db.updateRows = [];
    const res = await POST(verzoek(geldigeBody()), ctx);
    expect(await res.json()).toEqual({ soort: "type", sleutel: "68" });
    expect(leverAdvies).not.toHaveBeenCalled();
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
});
