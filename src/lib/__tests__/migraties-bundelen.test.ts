import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { bundel, sorteerMigraties } from "../../../scripts/migraties-bundelen.mjs";
import { databaseStatus, productieRef, supabaseRef } from "../omgeving";

describe("migraties bundelen", () => {
  it("sorteert op bestandsnaam (tijdstip) en slaat andere bestanden over", () => {
    expect(
      sorteerMigraties([
        "20261005090000_b.sql",
        "README.md",
        "20260928121815_schema.sql",
        "20261004110000_a.sql",
        "los.sql",
        "20261004100000_c.sql",
      ]),
    ).toEqual(["20260928121815_schema.sql", "20261004100000_c.sql", "20261004110000_a.sql", "20261005090000_b.sql"]);
  });

  it("de echte migraties: het schema komt eerst, alle bestanden doen mee", () => {
    const map = join(__dirname, "..", "..", "..", "supabase", "migrations");
    const alle = readdirSync(map).filter((n) => n.endsWith(".sql"));
    const volgorde = sorteerMigraties(alle);
    expect(volgorde).toHaveLength(alle.length);
    expect(volgorde[0]).toBe("20260928121815_schema.sql");
  });

  it("plakt de migraties in volgorde in één transactie", () => {
    const sql = bundel(
      [
        { naam: "20260101000000_een.sql", sql: "create table a ();\n\n" },
        { naam: "20260102000000_twee.sql", sql: "create table b ();" },
      ],
      new Date("2026-10-04T00:00:00Z"),
    );
    expect(sql).toContain("2 migraties");
    expect(sql.indexOf("begin;")).toBeLessThan(sql.indexOf("-- 20260101000000_een.sql"));
    expect(sql.indexOf("create table a ();")).toBeLessThan(sql.indexOf("create table b ();"));
    expect(sql.trimEnd().endsWith("commit;")).toBe(true);
  });
});

describe("omgeving: welke database", () => {
  it("leest de ref uit een Supabase-URL", () => {
    expect(supabaseRef("https://hzuhkollroehnrsghyax.supabase.co")).toBe("hzuhkollroehnrsghyax");
    expect(supabaseRef("http://127.0.0.1:54321")).toBe("127.0.0.1");
    expect(supabaseRef("geen url")).toBeNull();
    expect(productieRef({ PRODUCTIE_SUPABASE_REF: " ABC " })).toBe("abc");
    expect(productieRef({ PRODUCTIE_SUPABASE_URL: "https://abc.supabase.co" })).toBe("abc");
    expect(productieRef({})).toBeNull();
  });

  it("herkent een preview op de productiedatabase", () => {
    const prod = { PRODUCTIE_SUPABASE_REF: "abc" };
    expect(databaseStatus({ ...prod, VERCEL_ENV: "preview", NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co" })).toBe(
      "preview-op-productie",
    );
    expect(databaseStatus({ ...prod, VERCEL_ENV: "preview", NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co" })).toBe(
      "preview-apart",
    );
    expect(databaseStatus({ VERCEL_ENV: "preview", NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co" })).toBe(
      "preview-onbekend",
    );
    expect(databaseStatus({ ...prod, VERCEL_ENV: "production", NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co" })).toBe(
      "geen-preview",
    );
  });
});
