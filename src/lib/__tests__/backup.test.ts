import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";
import { backupBestandsnaam, controleerBackup, isGzip, leesbareGrootte } from "../backup/formaat";
import { BACKUP_TABELLEN, NIET_IN_BACKUP } from "../backup/tabellen";
import { bereidRijen, doelControle, refVan, teHerstellen } from "../../../scripts/backup-terugzetten.mjs";

vi.mock("@/lib/supabase/admin", () => ({ adminClient: vi.fn() }));
import { backupStream, backupStukken } from "../backup/maken";

const MIGRATIES = join(__dirname, "..", "..", "..", "supabase", "migrations");

function alleMigraties(): string {
  return readdirSync(MIGRATIES)
    .filter((n) => n.endsWith(".sql"))
    .sort()
    .map((n) => readFileSync(join(MIGRATIES, n), "utf8"))
    .join("\n");
}

describe("tabellen in de back-up", () => {
  it("elke tabel uit de migraties zit in de back-up of staat bewust in NIET_IN_BACKUP", () => {
    const sql = alleMigraties();
    const gemaakt = [...sql.matchAll(/create table (?:if not exists )?public\.([a-z_]+)/gi)].map((m) => m[1]);
    const gedropt = new Set([...sql.matchAll(/drop table (?:if exists )?(?:public\.)?([a-z_]+)/gi)].map((m) => m[1]));
    const verwacht = gemaakt.filter((t) => !gedropt.has(t));
    const gedekt = new Set([...BACKUP_TABELLEN.map((t) => t.naam), ...Object.keys(NIET_IN_BACKUP)]);
    expect(verwacht.filter((t) => !gedekt.has(t))).toEqual([]);
    // En andersom: geen tabellen die niet (meer) bestaan.
    expect(BACKUP_TABELLEN.map((t) => t.naam).filter((t) => !verwacht.includes(t))).toEqual([]);
  });

  it("de volgorde respecteert verwijzingen (references) tussen tabellen", () => {
    const sql = alleMigraties();
    const positie = new Map(BACKUP_TABELLEN.map((t, i) => [t.naam, i]));
    const uitgesteld = new Set(BACKUP_TABELLEN.flatMap((t) => (t.uitgesteld ?? []).map((k) => `${t.naam}.${k}`)));
    // "create table public.x ( ... kolom ... references public.y" en "alter table public.x add column k ... references public.y"
    const fouten: string[] = [];
    for (const blok of sql.split(/;\s*\n/)) {
      const tabel = blok.match(/(?:create|alter) table (?:if not exists )?public\.([a-z_]+)/i)?.[1];
      if (!tabel || !positie.has(tabel)) continue;
      for (const regel of blok.split("\n")) {
        const ref = regel.match(/^\s*(?:add column (?:if not exists )?)?([a-z_]+)\b.*references public\.([a-z_]+)/i);
        const fk = regel.match(/foreign key \(([a-z_]+)\) references public\.([a-z_]+)/i);
        const [kolom, doel] = ref ? [ref[1], ref[2]] : fk ? [fk[1], fk[2]] : [null, null];
        if (!kolom || !doel || doel === tabel || !positie.has(doel)) continue;
        if (uitgesteld.has(`${tabel}.${kolom}`)) continue;
        // orders.toegekend_type: de FK is later weer verwijderd.
        if (tabel === "orders" && kolom === "toegekend_type") continue;
        if (positie.get(doel)! > positie.get(tabel)!) fouten.push(`${tabel}.${kolom} → ${doel}`);
      }
    }
    expect(fouten).toEqual([]);
  });

  it("identiteitstabellen hebben de sleutel id", () => {
    for (const t of BACKUP_TABELLEN.filter((x) => x.identiteit)) expect(t.sleutel).toEqual(["id"]);
  });
});

function geldigeBackup() {
  return {
    formaat: "lida-thiry-backup",
    versie: 1,
    gemaakt_op: "2026-10-04T12:00:00.000Z",
    tabellen: Object.fromEntries(BACKUP_TABELLEN.map((t) => [t.naam, [] as Record<string, unknown>[]])),
    manifest: {
      formaat: "lida-thiry-backup",
      versie: 1,
      gemaakt_op: "2026-10-04T12:00:00.000Z",
      project: "abc",
      tabellen: BACKUP_TABELLEN.map((t) => ({ naam: t.naam, aantal: 0, sleutel: [...t.sleutel] })),
      opslag: { buckets: [{ naam: "media", publiek: true, bestanden: 2, bytes: 2048 }] },
      opmerking: "",
    },
  };
}

describe("controleerBackup", () => {
  it("keurt een geldige back-up goed", () => {
    const b = geldigeBackup();
    b.tabellen.orders = [{ id: "o1" }, { id: "o2" }];
    b.manifest.tabellen.find((t) => t.naam === "orders")!.aantal = 2;
    const c = controleerBackup(b);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.tabellen.find((t) => t.naam === "orders")).toEqual({ naam: "orders", inBestand: 2, volgensManifest: 2 });
    expect(c.waarschuwingen).toEqual([]);
    expect(c.opslag[0].bestanden).toBe(2);
  });

  it("weigert iets anders dan een back-up", () => {
    expect(controleerBackup(null)).toMatchObject({ ok: false });
    expect(controleerBackup([])).toMatchObject({ ok: false });
    expect(controleerBackup({ formaat: "iets" })).toMatchObject({ ok: false, fouten: [expect.stringContaining("formaat")] });
  });

  it("weigert een afgebroken download (zonder manifest)", () => {
    const b: Record<string, unknown> = geldigeBackup();
    delete b.manifest;
    expect(controleerBackup(b)).toMatchObject({ ok: false, fouten: [expect.stringContaining("manifest")] });
  });

  it("vindt verschillen tussen bestand en manifest en rijen zonder sleutel", () => {
    const b = geldigeBackup();
    b.tabellen.orders = [{ id: "o1" }, { naam: "zonder id" }];
    const c = controleerBackup(b);
    expect(c.ok).toBe(false);
    if (c.ok) return;
    expect(c.fouten).toContain("Tabel orders: 2 rijen in het bestand, maar 0 volgens het manifest.");
    expect(c.fouten).toContain("Tabel orders: 1 rij(en) zonder geldige sleutel (id).");
  });

  it("controleert samengestelde sleutels", () => {
    const b = geldigeBackup();
    b.tabellen.sectie_beelden = [{ sectie_id: "s", volgorde: 0 }, { sectie_id: "s" }];
    b.manifest.tabellen.find((t) => t.naam === "sectie_beelden")!.aantal = 2;
    const c = controleerBackup(b);
    expect(c.ok).toBe(false);
  });

  it("ontbrekende en onbekende tabellen", () => {
    const b = geldigeBackup();
    b.manifest.tabellen = b.manifest.tabellen.filter((t) => t.naam !== "media");
    delete (b.tabellen as Record<string, unknown>).media;
    b.manifest.tabellen.push({ naam: "oud", aantal: 0, sleutel: ["id"] });
    (b.tabellen as Record<string, unknown>).oud = [];
    const c = controleerBackup(b);
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.waarschuwingen).toEqual([
      "Tabel media zit niet in deze back-up (ouder formaat?).",
      "Tabel oud is onbekend in deze versie van de site.",
    ]);

    const zonder = geldigeBackup();
    delete (zonder.tabellen as Record<string, unknown>).orders;
    expect(controleerBackup(zonder)).toMatchObject({
      ok: false,
      fouten: ["Tabel orders staat in het manifest, maar ontbreekt in het bestand."],
    });
  });
});

describe("hulpjes", () => {
  it("bestandsnaam in Nederlandse tijd", () => {
    expect(backupBestandsnaam(new Date("2026-10-04T13:05:00Z"))).toBe("lida-thiry-backup-2026-10-04-1505.json.gz");
  });
  it("gzip herkennen en grootte", () => {
    expect(isGzip(new Uint8Array([0x1f, 0x8b, 8]))).toBe(true);
    expect(isGzip(new Uint8Array([0x7b]))).toBe(false);
    expect(leesbareGrootte(512)).toBe("512 B");
    expect(leesbareGrootte(2048)).toBe("2 kB");
  });
});

/** Nep-Supabase: tabellen met rijen, pagineerbaar met range(). */
function nepSupabase(data: Record<string, Record<string, unknown>[]>, kapot: string[] = []) {
  return {
    from(naam: string) {
      const q = {
        select: () => q,
        order: () => q,
        range: async (van: number, tot: number) =>
          kapot.includes(naam)
            ? { data: null, error: { message: `relation "${naam}" does not exist` } }
            : { data: (data[naam] ?? []).slice(van, tot + 1), error: null },
      };
      return q;
    },
    storage: {
      listBuckets: async () => ({ data: [{ name: "media", public: true }], error: null }),
      from: () => ({
        list: async (map: string) => ({
          data:
            map === ""
              ? [
                  { id: null, name: "map", metadata: null },
                  { id: "1", name: "a.jpg", metadata: { size: 100 } },
                ]
              : [{ id: "2", name: "b.jpg", metadata: { size: 50 } }],
          error: null,
        }),
      }),
    },
  };
}

describe("backup maken", () => {
  it("maakt een geldige back-up met pagina's van 1000 rijen en een manifest", async () => {
    const orders = Array.from({ length: 2345 }, (_, i) => ({ id: `o${i}`, email: `k${i}@x.nl` }));
    const supabase = nepSupabase({ orders, instellingen: [{ sleutel: "prijs", waarde: "29" }] }, ["fouten_log"]);
    let tekst = "";
    for await (const s of backupStukken(supabase as never, new Date("2026-10-04T12:00:00Z"))) tekst += s;
    const json = JSON.parse(tekst);
    expect(json.tabellen.orders).toHaveLength(2345);
    expect(json.tabellen.orders[2344]).toEqual({ id: "o2344", email: "k2344@x.nl" });
    expect(json.manifest.tabellen.find((t: { naam: string }) => t.naam === "fouten_log")).toMatchObject({
      aantal: 0,
      fout: expect.stringContaining("does not exist"),
    });
    expect(json.manifest.opslag.buckets).toEqual([{ naam: "media", publiek: true, bestanden: 2, bytes: 150 }]);
    const c = controleerBackup(json);
    expect(c.ok).toBe(true);
    if (c.ok) expect(c.waarschuwingen).toEqual([expect.stringContaining("fouten_log kon bij het maken niet worden gelezen")]);
  });

  it("de gzip-stream is terug te lezen", async () => {
    const stream = backupStream(nepSupabase({ inhoud: [{ sleutel: "a.b", waarde: {} }] }) as never, () => undefined);
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    expect(isGzip(bytes)).toBe(true);
    const json = JSON.parse(gunzipSync(bytes).toString("utf8"));
    expect(controleerBackup(json).ok).toBe(true);
    expect(json.tabellen.inhoud).toHaveLength(1);
  });
});

describe("scripts/backup-terugzetten.mjs", () => {
  it("weigert de productiedatabase en een onbekende productie", () => {
    expect(refVan("https://abcdef.supabase.co")).toBe("abcdef");
    expect(doelControle("https://abcdef.supabase.co", { PRODUCTIE_SUPABASE_REF: "abcdef" })).toBe("productie");
    expect(doelControle("https://abcdef.supabase.co/", { PRODUCTIE_SUPABASE_URL: "https://ABCDEF.supabase.co" })).toBe(
      "productie",
    );
    expect(doelControle("https://test.supabase.co", { PRODUCTIE_SUPABASE_REF: "abcdef" })).toBe("ok");
    expect(doelControle("https://test.supabase.co", {})).toBe("onbekend");
  });

  it("kiest tabellen in manifestvolgorde, zonder beheerders en eventueel zonder persoonsgegevens", () => {
    const manifest = {
      tabellen: BACKUP_TABELLEN.map((t) => ({ ...t, aantal: 0 })),
    };
    const alle = teHerstellen(manifest).map((t: { naam: string }) => t.naam);
    expect(alle).not.toContain("beheerders");
    expect(alle[0]).toBe("instellingen");
    const inhoud = teHerstellen(manifest, { alleenInhoud: true }).map((t: { naam: string }) => t.naam);
    expect(inhoud).toContain("adviessecties");
    expect(inhoud).not.toContain("orders");
    expect(inhoud).not.toContain("nb_contacten");
    expect(teHerstellen(manifest, { tabellen: ["media", "orders"] }).map((t: { naam: string }) => t.naam)).toEqual([
      "media",
      "orders",
    ]);
  });

  it("laat identiteits-id's weg en zet uitgestelde kolommen eerst leeg", () => {
    expect(bereidRijen({ identiteit: true }, [{ id: 5, x: 1 }])).toEqual([{ x: 1 }]);
    const rijen = [{ code: "X", beeld_id: "b1" }];
    expect(bereidRijen({ uitgesteld: ["beeld_id"] }, rijen)).toEqual([{ code: "X", beeld_id: null }]);
    expect(rijen[0].beeld_id).toBe("b1");
  });
});
