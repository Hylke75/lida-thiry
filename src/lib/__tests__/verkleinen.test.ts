import { describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import {
  alleOptPaden,
  binnen,
  doelFormaat,
  gedraaideAfmetingen,
  isOptPad,
  MAIL_MAX_PX,
  MINI_MAX_PX,
  optPaden,
  planVerkleining,
  WEB_MAX_PX,
} from "../media/verkleinen-regels";
import { isOptimaliseerbaar, opslagPatroon, origineelUrl } from "../media/afbeelding";
import { bevatVerwijzing, gebruikPatroon } from "../media/regels";

vi.mock("@/lib/supabase/admin", () => ({ adminClient: () => ({}) }));

describe("verkleinen: planning", () => {
  it("past binnen een maximum zonder te vergroten", () => {
    expect(binnen({ breedte: 4000, hoogte: 3000 }, 2000)).toEqual({ breedte: 2000, hoogte: 1500 });
    expect(binnen({ breedte: 3000, hoogte: 4500 }, 2000)).toEqual({ breedte: 1333, hoogte: 2000 });
    expect(binnen({ breedte: 800, hoogte: 600 }, 2000)).toEqual({ breedte: 800, hoogte: 600 });
    expect(binnen({ breedte: 10_000, hoogte: 1 }, 400)).toEqual({ breedte: 400, hoogte: 1 });
  });

  it("maakt WebP voor de website en een miniatuur van 400 px", () => {
    const plan = planVerkleining({ pad: "blog/abc.jpg", bucket: "blog", mime: "image/jpeg", afmetingen: { breedte: 6000, hoogte: 4000 } });
    expect(plan).toEqual({
      formaat: "webp",
      mime: "image/webp",
      extensie: "webp",
      web: { breedte: WEB_MAX_PX, hoogte: 1333 },
      mini: { breedte: MINI_MAX_PX, hoogte: 267 },
      paden: { web: "opt/blog/abc.jpg.webp", mini: "opt/blog/abc.jpg-400.webp" },
    });
  });

  it("houdt JPG/PNG voor de nieuwsbrief (mailprogramma's) en verkleint tot 1200 px", () => {
    const png = planVerkleining({ pad: "nb/x.png", bucket: "nieuwsbrief", mime: "image/png", afmetingen: { breedte: 3000, hoogte: 1000 } });
    expect(png).toMatchObject({ formaat: "png", web: { breedte: MAIL_MAX_PX, hoogte: 400 }, paden: { web: "opt/nb/x.png.png" } });
    expect(doelFormaat("image/jpeg", "nieuwsbrief")).toBe("jpeg");
    expect(doelFormaat("image/webp", "nieuwsbrief")).toBe("jpeg");
    expect(doelFormaat("image/png", "media")).toBe("webp");
  });

  it("laat SVG, ICO, GIF, gemaakte versies en onleesbare bestanden met rust", () => {
    const afm = { breedte: 100, hoogte: 100 };
    expect(planVerkleining({ pad: "logo/a.svg", bucket: "media", mime: "image/svg+xml", afmetingen: afm })).toBeNull();
    expect(planVerkleining({ pad: "logo/a.ico", bucket: "media", mime: "image/x-icon", afmetingen: afm })).toBeNull();
    expect(planVerkleining({ pad: "blog/a.gif", bucket: "blog", mime: "image/gif", afmetingen: afm })).toBeNull();
    expect(planVerkleining({ pad: "opt/blog/a.jpg.webp", bucket: "blog", mime: "image/webp", afmetingen: afm })).toBeNull();
    expect(planVerkleining({ pad: "blog/a.jpg", bucket: "blog", mime: "image/jpeg", afmetingen: null })).toBeNull();
  });

  it("houdt rekening met EXIF-rotatie", () => {
    expect(gedraaideAfmetingen({ width: 4000, height: 3000, orientation: 6 })).toEqual({ breedte: 3000, hoogte: 4000 });
    expect(gedraaideAfmetingen({ width: 4000, height: 3000, orientation: 1 })).toEqual({ breedte: 4000, hoogte: 3000 });
    expect(gedraaideAfmetingen({ width: 4000 })).toBeNull();
  });

  it("kent de versiepaden", () => {
    expect(optPaden("a/b.jpg", "jpeg")).toEqual({ web: "opt/a/b.jpg.jpg", mini: "opt/a/b.jpg-400.jpg" });
    expect(isOptPad("opt/a/b.jpg.webp")).toBe(true);
    expect(isOptPad("blog/opt.jpg")).toBe(false);
    expect(alleOptPaden("a/b.jpg")).toContain("opt/a/b.jpg.webp");
    expect(alleOptPaden("a/b.jpg")).toContain("opt/a/b.jpg-400.png");
  });
});

describe("verkleinen: met sharp", () => {
  it("verkleint, draait en verwijdert EXIF/GPS-gegevens", async () => {
    const { verkleinAfbeelding } = await import("../media/verkleinen");
    // Foto van 3000 × 2000 met EXIF (o.a. camera) en oriëntatie 6 (telefoon rechtop).
    const invoer = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: "#c08080" } })
      .jpeg()
      .withExif({ IFD0: { Make: "Telefoonmerk", Model: "X" }, IFD3: { GPSLatitudeRef: "N", GPSLatitude: "52/1 5/1 0/1" } })
      .withMetadata({ orientation: 6 })
      .toBuffer();
    expect((await sharp(invoer).metadata()).exif).toBeDefined();

    const v = await verkleinAfbeelding(invoer, { pad: "blog/foto.jpg", bucket: "blog", mime: "image/jpeg" });
    expect(v).not.toBeNull();
    expect(v!.origineel).toEqual({ breedte: 2000, hoogte: 3000 });
    const web = await sharp(v!.web.data).metadata();
    expect(web.format).toBe("webp");
    expect([web.width, web.height]).toEqual([1333, 2000]);
    expect(web.exif).toBeUndefined();
    expect(web.orientation).toBeUndefined();
    const mini = await sharp(v!.mini.data).metadata();
    expect(Math.max(mini.width!, mini.height!)).toBe(MINI_MAX_PX);
    expect(mini.exif).toBeUndefined();
  });

  it("maakt voor de nieuwsbrief een JPG zonder metadata", async () => {
    const { verkleinAfbeelding } = await import("../media/verkleinen");
    const invoer = await sharp({ create: { width: 2400, height: 1200, channels: 3, background: "#ffffff" } })
      .jpeg()
      .withExif({ IFD0: { Make: "Merk" } })
      .toBuffer();
    const v = await verkleinAfbeelding(invoer, { pad: "nb/a.jpg", bucket: "nieuwsbrief", mime: "image/jpeg" });
    const web = await sharp(v!.web.data).metadata();
    expect(web.format).toBe("jpeg");
    expect([web.width, web.height]).toEqual([MAIL_MAX_PX, 600]);
    expect(web.exif).toBeUndefined();
  });

  it("geeft null voor iets dat geen afbeelding is", async () => {
    const { verkleinAfbeelding } = await import("../media/verkleinen");
    expect(await verkleinAfbeelding(Buffer.from("geen afbeelding"), { pad: "a/b.jpg", bucket: "media", mime: "image/jpeg" })).toBeNull();
  });
});

describe("afbeeldingen tonen (next/image)", () => {
  const SB = "https://abc.supabase.co";
  const publiek = `${SB}/storage/v1/object/public/media/blog/a.jpg`;

  it("leidt het remotePattern af van de Supabase-URL", () => {
    expect(opslagPatroon(SB)).toEqual({ protocol: "https", hostname: "abc.supabase.co", port: "", pathname: "/storage/v1/object/public/**" });
    expect(opslagPatroon("http://127.0.0.1:54321")).toMatchObject({ protocol: "http", hostname: "127.0.0.1", port: "54321" });
    expect(opslagPatroon(undefined)).toBeNull();
    expect(opslagPatroon("geen url")).toBeNull();
  });

  it("optimaliseert alleen openbare foto's uit onze eigen opslag en eigen paden", () => {
    expect(isOptimaliseerbaar(publiek, SB)).toBe(true);
    expect(isOptimaliseerbaar(`${SB}/storage/v1/object/public/blog/opt/blog/a.jpg.webp`, SB)).toBe(true);
    expect(isOptimaliseerbaar("/logo.png", SB)).toBe(true);
    // Andere site, ondertekende link, SVG/GIF/ICO, protocol-relatief, query: niet.
    expect(isOptimaliseerbaar("https://andere-site.nl/foto.jpg", SB)).toBe(false);
    expect(isOptimaliseerbaar(`${SB}/storage/v1/object/sign/beeldbank/a.jpg?token=x`, SB)).toBe(false);
    expect(isOptimaliseerbaar(`${SB}/storage/v1/object/public/media/logo/a.svg`, SB)).toBe(false);
    expect(isOptimaliseerbaar(`${SB}/storage/v1/object/public/media/a.gif`, SB)).toBe(false);
    expect(isOptimaliseerbaar("/favicon.ico", SB)).toBe(false);
    expect(isOptimaliseerbaar("//evil.example/a.jpg", SB)).toBe(false);
    expect(isOptimaliseerbaar(`${publiek}?v=2`, SB)).toBe(false);
    expect(isOptimaliseerbaar(publiek, undefined)).toBe(false);
    expect(isOptimaliseerbaar(null, SB)).toBe(false);
  });

  it("vindt bij een webversie het origineel terug", () => {
    expect(origineelUrl(`${SB}/storage/v1/object/public/blog/opt/blog/a.jpg.webp`)).toBe(`${SB}/storage/v1/object/public/blog/blog/a.jpg`);
    expect(origineelUrl(`${SB}/storage/v1/object/public/blog/opt/blog/a.jpg-400.webp`)).toBe(`${SB}/storage/v1/object/public/blog/blog/a.jpg`);
    expect(origineelUrl(`${SB}/storage/v1/object/public/nieuwsbrief/opt/n/a.png.png`)).toBe(`${SB}/storage/v1/object/public/nieuwsbrief/n/a.png`);
    expect(origineelUrl(publiek)).toBe(publiek);
  });

  it("vindt het gebruik van een afbeelding ook via de webversie", () => {
    const m = { bucket: "blog", pad: "blog/a_b.jpg" };
    expect(bevatVerwijzing(`![x](${SB}/storage/v1/object/public/blog/opt/blog/a_b.jpg.webp)`, m)).toBe(true);
    expect(bevatVerwijzing(`![x](${SB}/storage/v1/object/public/media/opt/blog/a_b.jpg.webp)`, m)).toBe(false);
    expect(gebruikPatroon(m)).toBe("%/blog/%blog/a\\_b.jpg%");
  });
});
