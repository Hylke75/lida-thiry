import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.hoisted(() => vi.fn());
const adminClient = vi.hoisted(() => vi.fn(() => ({ rpc })));
vi.mock("@/lib/supabase/admin", () => ({ adminClient }));

import { clientIp, hashIp, magDoor, magDoorOpSleutel } from "../rate-limit";

function req(headers: Record<string, string>) {
  return new Request("http://localhost/x", { headers });
}

beforeEach(() => {
  rpc.mockReset();
  adminClient.mockClear();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("rate-limit", () => {
  it("neemt het eerste x-forwarded-for-adres, anders x-real-ip", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(clientIp(req({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(clientIp(req({}))).toBe("onbekend");
  });

  it("stuurt een gehashte sleutel en de limieten naar rate_limit_hit", async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await magDoor(req({ "x-forwarded-for": "1.2.3.4" }), "bestellen", 10, 600)).toBe(true);
    expect(rpc).toHaveBeenCalledWith("rate_limit_hit", {
      p_sleutel: `bestellen:${hashIp("1.2.3.4")}`,
      p_venster_seconden: 600,
      p_max: 10,
    });
  });

  it("weigert als de database false teruggeeft", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect(await magDoor(req({}), "x", 1, 60)).toBe(false);
  });

  it("faalt open bij een databasefout of exceptie", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "kapot" } });
    expect(await magDoor(req({}), "x", 1, 60)).toBe(true);
    adminClient.mockImplementationOnce(() => {
      throw new Error("geen env");
    });
    expect(await magDoor(req({}), "x", 1, 60)).toBe(true);
  });

  it("faalt dicht met bijFout: 'weigeren'", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "kapot" } });
    expect(await magDoor(req({}), "x", 1, 60, { bijFout: "weigeren" })).toBe(false);
    expect(await magDoorOpSleutel("y", 1, 60, { bijFout: "weigeren" })).toBe(false);
    adminClient.mockImplementationOnce(() => {
      throw new Error("geen env");
    });
    expect(await magDoorOpSleutel("y", 1, 60, { bijFout: "weigeren" })).toBe(false);
    rpc.mockResolvedValue({ data: true, error: null });
    expect(await magDoorOpSleutel("y", 1, 60, { bijFout: "weigeren" })).toBe(true);
  });
});
