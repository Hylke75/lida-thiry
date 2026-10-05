import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const update = vi.hoisted(() => vi.fn());
const adminClient = vi.hoisted(() =>
  vi.fn(() => ({
    rpc,
    from: () => ({ update: (w: unknown) => ({ eq: () => Promise.resolve(update(w)) }) }),
  })),
);
const stuurBeheerMelding = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@/lib/supabase/admin", () => ({ adminClient }));
const magDoorOpSleutel = vi.hoisted(() => vi.fn<(...a: unknown[]) => Promise<boolean>>(async () => true));
vi.mock("@/lib/beheermelding", () => ({ stuurBeheerMelding }));
vi.mock("@/lib/rate-limit", () => ({ magDoorOpSleutel }));

import { maakVingerafdruk, registreerFout } from "../fouten/registreer";

function rij(extra: Record<string, unknown> = {}) {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    vingerafdruk: "v",
    bron: "server",
    bericht: "kapot",
    stack: null,
    pad: null,
    digest: null,
    details: null,
    aantal: 1,
    eerst_op: "2026-10-04T10:00:00Z",
    laatst_op: "2026-10-04T10:00:00Z",
    gemeld_op: null,
    opgelost: false,
    ...extra,
  };
}

beforeEach(() => {
  rpc.mockReset();
  update.mockReset();
  stuurBeheerMelding.mockClear();
  magDoorOpSleutel.mockReset();
  magDoorOpSleutel.mockResolvedValue(true);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("registreerFout", () => {
  it("schoont de gegevens, maakt een vingerafdruk en mailt bij een nieuwe fout", async () => {
    rpc.mockResolvedValue({ data: rij(), error: null });
    const fout = new Error("Mail aan anna@example.nl mislukt");
    await registreerFout({ bron: "server", fout, pad: "/bestellen?email=a@b.nl", digest: "123", details: { email: "x@y.nl" } });

    expect(rpc).toHaveBeenCalledWith(
      "registreer_fout",
      expect.objectContaining({
        p_bron: "server",
        p_bericht: "Mail aan [e-mail] mislukt",
        p_pad: "/bestellen",
        p_digest: "123",
        p_details: { email: "[e-mail]" },
        p_vingerafdruk: maakVingerafdruk("server", "Mail aan anna@example.nl mislukt", fout.stack),
      }),
    );
    expect(JSON.stringify(rpc.mock.calls[0][1])).not.toContain("anna@example.nl");
    expect(stuurBeheerMelding).toHaveBeenCalledTimes(1);
    expect(stuurBeheerMelding.mock.calls[0]).toEqual([
      expect.stringContaining("Nieuwe fout"),
      expect.stringContaining("/admin/fouten/11111111-1111-1111-1111-111111111111"),
      { registreren: false },
    ]);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ details: { _gemeld_bij_aantal: 1 } }));
  });

  it("dezelfde soort fout met een ander e-mailadres krijgt dezelfde vingerafdruk", () => {
    expect(maakVingerafdruk("server", "Mail aan a@b.nl mislukt")).toBe(maakVingerafdruk("server", "Mail aan c@d.nl mislukt"));
    expect(maakVingerafdruk("server", "x")).toHaveLength(32);
  });

  it("mailt niet bij een herhaling binnen de drempel", async () => {
    rpc.mockResolvedValue({ data: rij({ aantal: 4, gemeld_op: new Date().toISOString(), details: { _gemeld_bij_aantal: 1 } }), error: null });
    await registreerFout({ bron: "browser", fout: "x" });
    expect(stuurBeheerMelding).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("mailt nooit voor beheermeldingen zelf of met melden: false", async () => {
    rpc.mockResolvedValue({ data: rij({ bron: "melding" }), error: null });
    await registreerFout({ bron: "melding", fout: "Factuur maken mislukt" });
    await registreerFout({ bron: "server", fout: "x", melden: false });
    expect(stuurBeheerMelding).not.toHaveBeenCalled();
  });

  it("mailt een nieuwe browserfout niet (openbaar endpoint), pas bij een drempel", async () => {
    rpc.mockResolvedValue({ data: rij({ bron: "browser" }), error: null });
    await registreerFout({ bron: "browser", fout: "x" });
    expect(stuurBeheerMelding).not.toHaveBeenCalled();
  });

  it("houdt een globale daglimiet op foutmails aan (faalt dicht)", async () => {
    rpc.mockResolvedValue({ data: rij(), error: null });
    magDoorOpSleutel.mockResolvedValue(false);
    await registreerFout({ bron: "server", fout: "x" });
    expect(magDoorOpSleutel).toHaveBeenCalledWith("fouten-mail", 20, 86400, { bijFout: "weigeren" });
    expect(stuurBeheerMelding).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("gooit nooit, ook niet als de database faalt", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "kapot" } });
    await expect(registreerFout({ bron: "server", fout: "x" })).resolves.toBeNull();
    rpc.mockRejectedValue(new Error("netwerk"));
    await expect(registreerFout({ bron: "server", fout: "x" })).resolves.toBeNull();
    adminClient.mockImplementationOnce(() => {
      throw new Error("geen env");
    });
    await expect(registreerFout({ bron: "server", fout: "x" })).resolves.toBeNull();
  });

  it("gebruikt een eigen vingerafdruk als die is opgegeven (testfout)", async () => {
    rpc.mockResolvedValue({ data: rij({ bron: "test" }), error: null });
    await registreerFout({ bron: "test", fout: "t", vingerafdruk: "test-1" });
    expect(rpc.mock.calls[0][1].p_vingerafdruk).toBe("test-1");
  });
});
