import Link from "next/link";
import { huidigeBeheerder } from "@/lib/admin-auth";
import { magPad, type Rol } from "@/lib/rollen";
import { BerichtenTeller } from "./BerichtenTeller";
import { PreviewWaarschuwing } from "./PreviewWaarschuwing";
import { PwaRegistratie } from "./PwaRegistratie";
import { ZoekVeld } from "./ZoekVeld";

interface NavLink {
  href: string;
  label: string;
}

interface NavGroep {
  label: string;
  links: readonly NavLink[];
}

/**
 * De beheernavigatie in groepen. Een groep met één pagina is een gewone link;
 * bij een groep met meer pagina's verschijnt een tweede rij met die pagina's
 * zodra je in die groep zit.
 */
const GROEPEN = [
  {
    label: "Overzicht",
    links: [
      { href: "/admin", label: "Overzicht" },
      { href: "/admin/statistieken", label: "Statistieken" },
    ],
  },
  {
    label: "Relaties",
    links: [
      { href: "/admin/adresboek", label: "Adresboek" },
      { href: "/admin/berichten", label: "Berichten" },
      { href: "/admin/reviews", label: "Reviews" },
    ],
  },
  {
    label: "Afspraken",
    links: [
      { href: "/admin/afspraken", label: "Agenda" },
      { href: "/admin/afspraken/instellingen", label: "Instellingen" },
    ],
  },
  {
    label: "Verkoop",
    links: [
      { href: "/admin/bestellingen", label: "Bestellingen" },
      { href: "/admin/kortingscodes", label: "Kortingscodes" },
      { href: "/admin/cadeaubonnen", label: "Cadeaubonnen" },
    ],
  },
  {
    label: "Advies",
    links: [
      { href: "/admin/lichaamstypes", label: "Lichaamstypes" },
      { href: "/admin/types", label: "Adviestypes" },
      { href: "/admin/beeldbank", label: "Beeldbank" },
      { href: "/admin/meetinstructies", label: "Meetinstructies" },
    ],
  },
  {
    label: "Website",
    links: [
      { href: "/admin/paginas", label: "Pagina's" },
      { href: "/admin/website/homepage", label: "Homepage" },
      { href: "/admin/website/seo", label: "SEO" },
      { href: "/admin/blog", label: "Blog" },
      { href: "/admin/blog/ai", label: "Schrijven met AI" },
      { href: "/admin/teksten", label: "Teksten" },
      { href: "/admin/media", label: "Media" },
      { href: "/admin/doorverwijzingen", label: "Doorverwijzingen" },
      { href: "/admin/versies/prullenbak", label: "Prullenbak" },
      { href: "/admin/website", label: "Instellingen" },
    ],
  },
  {
    label: "Nieuwsbrief",
    links: [
      { href: "/admin/nieuwsbrief", label: "Overzicht" },
      { href: "/admin/nieuwsbrief/campagnes", label: "Campagnes" },
      { href: "/admin/nieuwsbrief/contacten", label: "Contacten" },
      { href: "/admin/nieuwsbrief/formulieren", label: "Formulieren" },
      { href: "/admin/nieuwsbrief/automatisch", label: "Automatisch" },
      { href: "/admin/nieuwsbrief/afleverbaarheid", label: "Afleverbaarheid" },
    ],
  },
  {
    label: "Instellingen",
    links: [
      { href: "/admin/instellingen", label: "Algemeen" },
      { href: "/admin/beheerders", label: "Beheerders" },
      { href: "/admin/meldingen", label: "Meldingen" },
      { href: "/admin/fouten", label: "Fouten" },
      { href: "/admin/backup", label: "Back-up" },
      { href: "/admin/beveiliging", label: "Beveiliging" },
      { href: "/admin/logboek", label: "Logboek" },
    ],
  },
] as const satisfies readonly NavGroep[];

export type AdminPagina = (typeof GROEPEN)[number]["links"][number]["href"];

/** Een beheerpagina of een pagina daaronder (bijv. "/admin/nieuwsbrief/campagnes/123"). */
export type AdminPad = AdminPagina | `${AdminPagina}/${string}`;

const ALLE_HREFS: readonly string[] = GROEPEN.flatMap((g) => g.links.map((l) => l.href));

/**
 * De navigatielink die bij `pad` hoort: een exacte match, anders de langste link
 * waar het pad onder valt ("/admin/nieuwsbrief/campagnes/123" → Campagnes).
 */
function actieveLink(pad: string | undefined): string | undefined {
  if (!pad) return undefined;
  if (ALLE_HREFS.includes(pad)) return pad;
  return ALLE_HREFS.filter((h) => h !== "/admin" && pad.startsWith(`${h}/`)).sort((a, b) => b.length - a.length)[0];
}

function groepIsActief(g: NavGroep, actief: string | undefined): boolean {
  return g.links.some((l) => l.href === actief);
}

function pil(actief: boolean): string {
  return `rounded-full px-3 py-1.5 ${
    actief
      ? "bg-accent-zacht font-medium text-accent"
      : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5"
  }`;
}

function Uitloggen({ className }: { className?: string }) {
  return (
    <form action="/auth/uitloggen" method="post" className={className}>
      <button className="px-2 py-1.5 text-foreground/70 underline underline-offset-4 hover:text-black/80 dark:hover:text-white/80">
        Uitloggen
      </button>
    </form>
  );
}

/**
 * De groepen en links die een rol mag zien (lege groepen vallen weg). Zonder
 * volledige inlog (tweestapsverificatie nog in te stellen) alleen Beveiliging.
 */
function zichtbareGroepen(rol: Rol | null, alleenBeveiliging: boolean): NavGroep[] {
  return GROEPEN.map((g) => ({
    label: g.label,
    links: g.links.filter((l) => (alleenBeveiliging ? l.href === "/admin/beveiliging" : magPad(rol, l.href))),
  })).filter((g) => g.links.length > 0);
}

/** Navigatiebalk bovenaan elke beheerpagina; toont alleen wat de rol van de beheerder mag. */
export async function AdminNav({ actief: pad }: { actief?: AdminPad }) {
  const actief = actieveLink(pad);
  const ik = await huidigeBeheerder();
  const groepen: readonly NavGroep[] = zichtbareGroepen(ik?.rol ?? null, !ik || ik.mfa !== "ok");
  const metZoeken = Boolean(ik && ik.mfa === "ok" && magPad(ik.rol, "/admin/zoeken"));
  const beginHref = groepen[0]?.links[0]?.href ?? "/admin/beveiliging";
  const huidigeGroep = groepen.find((g) => groepIsActief(g, actief));
  const huidigeLink = huidigeGroep?.links.find((l) => l.href === actief);
  const subLinks = huidigeGroep && huidigeGroep.links.length > 1 ? huidigeGroep.links : null;

  return (
    <header className="flex flex-col gap-3 border-b border-black/10 pb-4 dark:border-white/15">
      <PwaRegistratie />
      <PreviewWaarschuwing />
      {/* Telefoon: compacte balk met uitklapmenu. */}
      <details className="group sm:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="font-serif text-xl tracking-tight">Beheer</span>
            {huidigeLink && (
              <span className="truncate text-sm text-foreground/70">
                {huidigeGroep && huidigeGroep.links.length > 1 ? `${huidigeGroep.label} · ` : ""}
                {huidigeLink.label}
              </span>
            )}
          </span>
          <span className="shrink-0 rounded-full border border-black/15 px-3 py-1.5 text-sm dark:border-white/20">
            <span className="group-open:hidden">Menu ☰</span>
            <span className="hidden group-open:inline">Sluiten ✕</span>
          </span>
        </summary>
        <nav aria-label="Beheer" className="mt-3 flex flex-col gap-3 text-sm">
          {metZoeken && <ZoekVeld />}
          {groepen.map((g) =>
            g.links.length === 1 ? (
              <Link
                key={g.label}
                href={g.links[0].href}
                aria-current={actief === g.links[0].href ? "page" : undefined}
                className={`${pil(actief === g.links[0].href)} w-fit`}
              >
                {g.label}
              </Link>
            ) : (
              <div key={g.label} className="flex flex-col gap-1">
                <span className="px-3 text-xs uppercase tracking-wide text-black/40 dark:text-white/40">{g.label}</span>
                <div className="flex flex-wrap gap-1">
                  {g.links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      aria-current={actief === l.href ? "page" : undefined}
                      className={pil(actief === l.href)}
                    >
                      {l.label}
                      {l.href === "/admin/berichten" && <BerichtenTeller />}
                    </Link>
                  ))}
                </div>
              </div>
            ),
          )}
          <Uitloggen className="border-t border-black/10 pt-2 dark:border-white/15" />
        </nav>
      </details>

      {/* Groter scherm: groepen op één rij, de pagina's van de actieve groep eronder. */}
      <div className="hidden flex-col gap-2 sm:flex">
        <div className="flex items-center justify-between gap-4">
          <Link href={beginHref} className="font-serif text-xl tracking-tight">
            Beheer
          </Link>
          {metZoeken && <ZoekVeld className="w-36 shrink-0 lg:w-52" />}
          <nav aria-label="Beheer" className="flex flex-wrap items-center justify-end gap-1 text-sm">
            {groepen.map((g) => {
              const isActief = groepIsActief(g, actief);
              return (
                <Link
                  key={g.label}
                  href={g.links[0].href}
                  aria-current={isActief ? (g.links.length === 1 ? "page" : "true") : undefined}
                  className={pil(isActief)}
                >
                  {g.label}
                  {g.links.some((l) => l.href === "/admin/berichten") && <BerichtenTeller />}
                </Link>
              );
            })}
            <Uitloggen className="ml-2" />
          </nav>
        </div>
        {subLinks && (
          <nav aria-label={huidigeGroep?.label} className="flex flex-wrap gap-1 text-sm">
            {subLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={actief === l.href ? "page" : undefined}
                className={`rounded-full border px-3 py-1 ${
                  actief === l.href
                    ? "border-accent/40 font-medium text-accent"
                    : "border-black/10 text-foreground/70 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
                }`}
              >
                {l.label}
                {l.href === "/admin/berichten" && <BerichtenTeller />}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}

export { Melding } from "./Melding";
