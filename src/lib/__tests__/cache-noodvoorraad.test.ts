import { describe, expect, it, vi } from "vitest";

// Buiten Next: unstable_cache roept de functie gewoon aan, revalidateTag doet niets.
vi.mock("next/cache", () => ({
  unstable_cache:
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>) =>
    (...a: A) =>
      fn(...a),
  revalidateTag: vi.fn(),
}));

const { publiekGecached } = await import("../cache/publiek");
const { vernieuwPubliekeData } = await import("../cache/vernieuw");

describe("publieke cache: laatst bekende gegevens", () => {
  it("valt bij een databasefout terug op het laatst bekende resultaat, tot de tag vernieuwd wordt", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let fout = false;
    const lees = publiekGecached("test-noodvoorraad", ["blog"], async () => {
      if (fout) throw new Error("database weg");
      return ["bericht"];
    });
    expect(await lees()).toEqual(["bericht"]);

    fout = true;
    expect(await lees()).toEqual(["bericht"]);

    // In het beheer offline gehaald: de oude gegevens mogen niet terugkomen.
    vernieuwPubliekeData("blog_berichten");
    await expect(lees()).rejects.toThrow("database weg");
  });

  it("vergeet alleen de gegevens van de vernieuwde tags", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let fout = false;
    const lees = publiekGecached("test-noodvoorraad-paginas", ["paginas"], async () => {
      if (fout) throw new Error("database weg");
      return "pagina";
    });
    expect(await lees()).toBe("pagina");
    fout = true;
    vernieuwPubliekeData("blog_berichten");
    expect(await lees()).toBe("pagina");
  });
});
