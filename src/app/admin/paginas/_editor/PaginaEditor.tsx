"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  fotoplekBijCursor,
  pasOpmaakToe,
  SEO_OMSCHRIJVING_MAX,
  SEO_TITEL_MAX,
  vindPlaatshouders,
  voegAfbeeldingIn,
  type Opmaakknop,
} from "@/lib/blog/beheer";
import {
  INTRO_MAX,
  MENU_LABEL_MAX,
  paginaOmschrijving,
  publicatieProblemen,
  slugFout,
  slugSuggestie,
  valideerPagina,
  voegBlokIn,
  type FormulierKeuze,
  type Pagina,
} from "@/lib/paginas/beheer";
import { MediaKiezer } from "@/components/admin/MediaKiezer";
import { blokVoorFormulier, onbekendeBlokken, PAGINA_BLOKKEN } from "@/lib/paginas/regels";
import { paginaNaarConcept, publiceerPagina, slaPaginaOp, type PaginaUitkomst } from "../acties";
import { invoerKlasse, kaart, knopHoofd, knopKlein, knopRand, zacht } from "../../nieuwsbrief/_editor/stijl";
import { StatusBadge } from "./onderdelen";
import { PaginaUpload } from "./PaginaUpload";
import { PaginaVoorbeeld } from "./voorbeeld";

interface Velden {
  titel: string;
  slug: string;
  intro: string;
  inhoud: string;
  omslag_url: string;
  omslag_alt: string;
  in_menu: boolean;
  in_footer: boolean;
  menu_label: string;
  volgorde: string;
  seo_titel: string;
  seo_omschrijving: string;
  niet_indexeren: boolean;
}

function alsVelden(p: Pagina): Velden {
  return {
    titel: p.titel,
    slug: p.slug,
    intro: p.intro,
    inhoud: p.inhoud,
    omslag_url: p.omslag_url ?? "",
    omslag_alt: p.omslag_alt,
    in_menu: p.in_menu,
    in_footer: p.in_footer,
    menu_label: p.menu_label,
    volgorde: String(p.volgorde),
    seo_titel: p.seo_titel,
    seo_omschrijving: p.seo_omschrijving,
    niet_indexeren: p.niet_indexeren,
  };
}

const alsInvoer = (v: Velden) => ({ ...v, omslag_url: v.omslag_url.trim() || null, volgorde: Number(v.volgorde) || 0 });

const WERKBALK: { knop: Opmaakknop; label: ReactNode; titel: string }[] = [
  { knop: "kop", label: "Kop", titel: "Tussenkop (## aan het begin van de regel)" },
  { knop: "subkop", label: "Subkop", titel: "Kleinere kop (###)" },
  { knop: "vet", label: <strong>Vet</strong>, titel: "Vetgedrukt (**tekst**)" },
  { knop: "lijst", label: "• Lijst", titel: "Opsomming (- aan het begin van de regel)" },
  { knop: "link", label: "Link", titel: "Link: [tekst](https://…) of [tekst](/contact)" },
];

function Teller({ waarde, max }: { waarde: string; max: number }) {
  const n = waarde.length;
  return (
    <span className={`text-xs tabular-nums ${n > max ? "font-medium text-red-700 dark:text-red-400" : n > max * 0.9 ? "text-amber-700 dark:text-amber-300" : zacht}`}>
      {n}/{max}
    </span>
  );
}

function Meldingen({ soort, tekst }: { soort: "ok" | "fout"; tekst: string[] }) {
  return (
    <div
      role={soort === "fout" ? "alert" : "status"}
      className={`rounded-lg px-4 py-3 text-sm ${
        soort === "ok"
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {tekst.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
    </div>
  );
}

function Veld({ label, htmlFor, teller, uitleg, children }: { label: string; htmlFor: string; teller?: ReactNode; uitleg?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {teller}
      </div>
      {children}
      {uitleg && <div className={`text-xs ${zacht}`}>{uitleg}</div>}
    </div>
  );
}

function Vinkje({ checked, onChange, titel, uitleg }: { checked: boolean; onChange: (b: boolean) => void; titel: string; uitleg?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
      <span>
        <span className="font-medium">{titel}</span>
        {uitleg && <span className={`block text-xs ${zacht}`}>{uitleg}</span>}
      </span>
    </label>
  );
}

/** Zo ongeveer toont Google de pagina in de zoekresultaten. */
function GoogleVoorbeeld({ titel, url, omschrijving }: { titel: string; url: string; omschrijving: string }) {
  const kort = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1).replace(/\s+\S*$/, "")} …` : s);
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-black/10 bg-white p-4 font-sans dark:border-white/15">
      <p className="truncate text-xs text-[#4d5156]">{url.replace(/^https?:\/\//, "").replace(/\//g, " › ")}</p>
      <p className="break-words text-lg leading-snug text-[#1a0dab]">{kort(titel || "(geen titel)", 60)}</p>
      <p className="break-words text-sm leading-snug text-[#4d5156]">{kort(omschrijving || "(geen omschrijving)", 158)}</p>
    </div>
  );
}

function Draaier() {
  return <span aria-hidden className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-3px]" />;
}

export function PaginaEditor({ pagina, formulieren, site }: { pagina: Pagina; formulieren: FormulierKeuze[]; site: string }) {
  const router = useRouter();
  const [opgeslagen, setOpgeslagen] = useState(pagina);
  const [v, setV] = useState<Velden>(() => alsVelden(pagina));
  const [gewijzigd, setGewijzigd] = useState(false);
  const [slugAuto, setSlugAuto] = useState(
    pagina.status === "concept" && (pagina.slug === slugSuggestie(pagina.titel) || /^nieuwe-pagina(-\d+)?$/.test(pagina.slug)),
  );
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string[] } | null>(null);
  const [tab, setTab] = useState<"schrijven" | "voorbeeld">("schrijven");
  const [foto, setFoto] = useState<{ alt: string } | null>(null);
  const tekstvak = useRef<HTMLTextAreaElement>(null);
  const blokMenu = useRef<HTMLDetailsElement>(null);

  const id = opgeslagen.id;
  const online = opgeslagen.status === "gepubliceerd";
  const url = `${site}/${v.slug || slugSuggestie(v.titel)}`;
  const formulierSlugs = useMemo(() => formulieren.map((f) => f.slug), [formulieren]);
  const onbekend = useMemo(() => onbekendeBlokken(v.inhoud, formulierSlugs), [v.inhoud, formulierSlugs]);
  const plekken = useMemo(() => vindPlaatshouders(`${v.intro}\n${v.inhoud}`), [v.intro, v.inhoud]);
  const validatie = useMemo(() => valideerPagina(alsInvoer(v)), [v]);
  const problemen = useMemo(
    () => [...(validatie.ok ? [] : validatie.fouten), ...publicatieProblemen({ titel: v.titel, intro: v.intro, inhoud: v.inhoud })],
    [validatie, v.titel, v.intro, v.inhoud],
  );
  const slugMelding = slugFout(v.slug);

  // Waarschuwen bij weggaan met niet-opgeslagen wijzigingen.
  useEffect(() => {
    if (!gewijzigd) return;
    const waarschuw = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [gewijzigd]);

  const zet = (w: Partial<Velden>) => {
    setV((oud) => ({ ...oud, ...w }));
    setGewijzigd(true);
    setMelding(null);
  };
  const zetTitel = (titel: string) => zet(slugAuto ? { titel, slug: slugSuggestie(titel) } : { titel });

  function verwerk(r: PaginaUitkomst, alleenStatus = false) {
    if (!r.ok) return setMelding({ soort: "fout", tekst: r.fouten });
    setOpgeslagen(r.pagina);
    if (alleenStatus) {
      setMelding({ soort: "ok", tekst: [r.melding, "Let op: je andere wijzigingen zijn nog niet opgeslagen."] });
    } else {
      setV(alsVelden(r.pagina));
      setGewijzigd(false);
      setMelding({ soort: "ok", tekst: [r.melding] });
      if (r.pagina.status === "gepubliceerd") setSlugAuto(false);
    }
    router.refresh();
  }

  async function voerUit(label: string, actie: () => Promise<PaginaUitkomst>, alleenStatus = false) {
    if (bezig) return;
    setBezig(label);
    setMelding(null);
    try {
      verwerk(await actie(), alleenStatus);
    } catch {
      setMelding({ soort: "fout", tekst: ["Er ging iets mis. Controleer je internetverbinding en probeer het opnieuw."] });
    } finally {
      setBezig(null);
    }
  }

  const opslaan = () => voerUit("opslaan", () => slaPaginaOp(id, alsInvoer(v)));

  // Ctrl/Cmd+S = opslaan.
  const opToets = useEffectEvent((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      void opslaan();
    }
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => opToets(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Tekstvak --------------------------------------------------------------------------

  function selectie(): { start: number; eind: number } {
    const el = tekstvak.current;
    return el ? { start: el.selectionStart, eind: el.selectionEnd } : { start: v.inhoud.length, eind: v.inhoud.length };
  }

  function selecteer(start: number, eind: number) {
    setTab("schrijven");
    requestAnimationFrame(() => {
      const el = tekstvak.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(start, eind);
    });
  }

  function werkbalk(knop: Opmaakknop) {
    const { start, eind } = selectie();
    const r = pasOpmaakToe(v.inhoud, start, eind, knop);
    zet({ inhoud: r.tekst });
    selecteer(r.start, r.eind);
  }

  function blokInvoegen(naam: string) {
    const { start, eind } = selectie();
    const r = voegBlokIn(v.inhoud, start, eind, naam);
    zet({ inhoud: r.tekst });
    if (blokMenu.current) blokMenu.current.open = false;
    selecteer(r.eind, r.eind);
  }

  function openFoto() {
    const { start, eind } = selectie();
    setFoto({ alt: fotoplekBijCursor(v.inhoud, start, eind) ?? "" });
  }

  function fotoIngevoegd(fotoUrl: string, altUitBibliotheek = "") {
    const { start, eind } = selectie();
    const r = voegAfbeeldingIn(v.inhoud, start, eind, fotoUrl, foto?.alt.trim() || altUitBibliotheek);
    zet({ inhoud: r.tekst });
    setFoto(null);
    selecteer(r.eind, r.eind);
  }

  // Publiceren ------------------------------------------------------------------------

  const kanPubliceren = problemen.length === 0 && !bezig;
  const nuPubliceren = () => {
    if (!confirm("De pagina nu publiceren? Hij is daarna direct zichtbaar op je website.")) return;
    void voerUit("publiceren", () => publiceerPagina(id, alsInvoer(v)));
  };
  const offline = () => {
    if (gewijzigd && !confirm("Je hebt wijzigingen die nog niet zijn opgeslagen. Die blijven in de editor staan; vergeet niet daarna op te slaan. Doorgaan?")) return;
    if (!confirm("De pagina offline halen? Hij is dan niet meer te zien op je website (ook niet in het menu).")) return;
    void voerUit("concept", () => paginaNaarConcept(id), gewijzigd);
  };

  const schrijfKolom = tab === "schrijven" ? "flex" : "hidden lg:flex";
  const voorbeeldKolom = tab === "voorbeeld" ? "flex" : "hidden lg:flex";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Vaste balk met status en opslaan. */}
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 dark:border-white/15">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <StatusBadge status={opgeslagen.status} />
          <span className={gewijzigd ? "font-medium text-amber-700 dark:text-amber-300" : zacht}>{gewijzigd ? "● Niet opgeslagen" : "Alles opgeslagen"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {online && !gewijzigd ? (
            <a href={`/${opgeslagen.slug}`} target="_blank" rel="noopener noreferrer" className={knopRand}>
              Bekijken ↗
            </a>
          ) : (
            <Link href={`/admin/paginas/${id}/voorbeeld`} className={knopRand} title={gewijzigd ? "Het voorbeeld toont de laatst opgeslagen versie" : undefined}>
              Voorbeeld
            </Link>
          )}
          <button type="button" onClick={opslaan} disabled={Boolean(bezig) || !gewijzigd} className={knopHoofd} title="Opslaan (Ctrl+S of ⌘S)">
            {bezig === "opslaan" ? (
              <>
                <Draaier /> Opslaan…
              </>
            ) : (
              "Opslaan"
            )}
          </button>
        </div>
      </div>

      {melding && <Meldingen soort={melding.soort} tekst={melding.tekst} />}

      {/* Titel en intro */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="titel" className="text-sm font-medium">
            Titel
          </label>
          <input
            id="titel"
            value={v.titel}
            maxLength={200}
            onChange={(e) => zetTitel(e.target.value)}
            className={`${invoerKlasse} font-serif text-xl sm:text-2xl`}
            placeholder="Bijv. Over mij"
          />
        </div>
        <Veld label="Intro" htmlFor="intro" teller={<Teller waarde={v.intro} max={INTRO_MAX} />} uitleg="Een of twee zinnen onder de titel (zonder opmaak).">
          <textarea id="intro" value={v.intro} maxLength={INTRO_MAX} rows={2} onChange={(e) => zet({ intro: e.target.value })} className={invoerKlasse} />
        </Veld>
      </div>

      {/* Tekst + voorbeeld */}
      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex gap-1 rounded-full bg-black/5 p-1 text-sm lg:hidden dark:bg-white/10" role="tablist">
          {(["schrijven", "voorbeeld"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-full px-3 py-1.5 ${tab === t ? "bg-kaart font-medium shadow-sm" : zacht}`}
            >
              {t === "schrijven" ? "Schrijven" : "Voorbeeld"}
            </button>
          ))}
        </div>

        <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
          <div className={`${schrijfKolom} min-w-0 flex-col gap-2`}>
            <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Opmaak">
              {WERKBALK.map((w) => (
                <button key={w.knop} type="button" title={w.titel} onMouseDown={(e) => e.preventDefault()} onClick={() => werkbalk(w.knop)} className={knopKlein}>
                  {w.label}
                </button>
              ))}
              <button type="button" title="Foto uploaden en op de plek van de cursor invoegen" onMouseDown={(e) => e.preventDefault()} onClick={openFoto} className={knopKlein}>
                📷 Foto
              </button>
              <details ref={blokMenu} className="relative">
                <summary className={`${knopKlein} cursor-pointer list-none [&::-webkit-details-marker]:hidden`} onMouseDown={(e) => e.preventDefault()}>
                  ＋ Blok invoegen
                </summary>
                <div className="absolute left-0 z-30 mt-1 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-0.5 rounded-xl border border-black/10 bg-kaart p-1.5 text-sm shadow-lg dark:border-white/15">
                  {Object.entries(PAGINA_BLOKKEN).map(([naam, uitleg]) => (
                    <button
                      key={naam}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => blokInvoegen(naam)}
                      className="flex flex-col items-start rounded-lg px-2.5 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <code className="text-xs">{`{${naam}}`}</code>
                      <span className={`text-xs ${zacht}`}>{uitleg}</span>
                    </button>
                  ))}
                  {formulieren.length > 0 && <p className={`px-2.5 pt-2 text-xs font-medium uppercase tracking-wide ${zacht}`}>Nieuwsbriefformulieren</p>}
                  {formulieren.map((f) => (
                    <button
                      key={f.slug}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => blokInvoegen(blokVoorFormulier(f.slug))}
                      className="flex flex-col items-start rounded-lg px-2.5 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <code className="break-all text-xs">{`{${blokVoorFormulier(f.slug)}}`}</code>
                      <span className={`text-xs ${zacht}`}>{f.naam}</span>
                    </button>
                  ))}
                </div>
              </details>
            </div>

            {foto && (
              <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/15 dark:bg-white/5">
                <Veld label="Korte omschrijving van de foto" htmlFor="foto-alt" uitleg="Voor slechtzienden en Google. De foto komt op de plek van de cursor (of vervangt de [foto: …]-regel waar de cursor op staat).">
                  <input id="foto-alt" value={foto.alt} maxLength={200} onChange={(e) => setFoto({ alt: e.target.value })} className={invoerKlasse} placeholder="Bijv. Lida bij een rek met kleding" />
                </Veld>
                <div className="flex flex-wrap items-start gap-2">
                  <PaginaUpload map="afbeeldingen" label="Foto kiezen en invoegen" disabled={!foto.alt.trim()} onUrl={(u) => fotoIngevoegd(u)} />
                  <MediaKiezer accept="foto" map="paginas" knopTekst="Uit mediabibliotheek" titel="Foto invoegen" onKies={(m) => fotoIngevoegd(m.url, m.alt)} />
                  <button type="button" onClick={() => setFoto(null)} className={knopRand}>
                    Annuleren
                  </button>
                </div>
              </div>
            )}

            <textarea
              ref={tekstvak}
              id="inhoud"
              aria-label="Tekst van de pagina"
              value={v.inhoud}
              onChange={(e) => zet({ inhoud: e.target.value })}
              rows={22}
              spellCheck
              lang="nl"
              className={`${invoerKlasse} min-h-[45vh] resize-y font-mono text-[13px] leading-relaxed lg:min-h-[65vh]`}
              placeholder={"Schrijf hier de tekst van de pagina.\n\n## Tussenkop\n\nEen alinea met **vette tekst** en een [link](/blog).\n\n{contactformulier}"}
            />
            {onbekend.length > 0 && (
              <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                Onbekend blok: {onbekend.map((b) => `{${b}}`).join(", ")}. Dit wordt op de site niet getoond. Controleer de spelling, of kies het blok via
                &quot;Blok invoegen&quot; (een nieuwsbriefformulier moet bestaan en actief zijn).
              </p>
            )}
            <p className={`text-xs ${zacht}`}>
              Opmaak: <code>## kop</code>, <code>### subkop</code>, <code>- lijst</code>, <code>**vet**</code>, <code>[tekst](https://…)</code>, een lege regel voor een
              nieuwe alinea. Een blok zoals <code>{"{contactformulier}"}</code> staat op een eigen regel.
            </p>
          </div>

          <div className={`${voorbeeldKolom} min-w-0 flex-col gap-2 lg:sticky lg:top-20`}>
            <p className={`hidden text-xs lg:block ${zacht}`}>Voorbeeld (werkt direct bij; blokken zie je als gemarkeerde vakken)</p>
            <div className="max-h-none min-w-0 overflow-y-auto rounded-2xl border border-black/10 bg-background p-4 sm:p-6 lg:max-h-[75vh] dark:border-white/15">
              <PaginaVoorbeeld
                titel={v.titel}
                intro={v.intro}
                inhoud={v.inhoud}
                omslagUrl={v.omslag_url || null}
                omslagAlt={v.omslag_alt}
                formulieren={formulieren}
                kop="h2"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Webadres en menu */}
          <section className={kaart}>
            <h2 className="text-lg font-semibold">Webadres en menu</h2>
            <Veld
              label="Webadres"
              htmlFor="slug"
              uitleg={
                <>
                  <span className="break-all">{url}</span>
                  {slugMelding && <span className="mt-1 block font-medium text-red-700 dark:text-red-400">{slugMelding}</span>}
                  {online && v.slug !== opgeslagen.slug && (
                    <span className="mt-1 block font-medium text-amber-700 dark:text-amber-300">
                      Let op: deze pagina staat al online. Met een nieuw webadres werken bestaande links naar het oude adres niet meer.
                    </span>
                  )}
                </>
              }
            >
              <div className="flex gap-2">
                <input
                  id="slug"
                  value={v.slug}
                  maxLength={80}
                  aria-invalid={Boolean(slugMelding)}
                  onChange={(e) => {
                    setSlugAuto(false);
                    zet({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") });
                  }}
                  onBlur={() => {
                    const schoon = v.slug.replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
                    if (schoon !== v.slug) zet({ slug: schoon });
                  }}
                  className={invoerKlasse}
                />
                {!slugAuto && slugSuggestie(v.titel) !== v.slug && (
                  <button type="button" onClick={() => zet({ slug: slugSuggestie(v.titel) })} className={`${knopRand} shrink-0`} title="Webadres opnieuw maken uit de titel">
                    Uit titel
                  </button>
                )}
              </div>
            </Veld>
            <Vinkje checked={v.in_menu} onChange={(b) => zet({ in_menu: b })} titel="In het menu bovenaan" uitleg="Alleen zichtbaar zolang de pagina online staat." />
            <Vinkje checked={v.in_footer} onChange={(b) => zet({ in_footer: b })} titel="In de footer (onderaan elke pagina)" />
            <div className="grid min-w-0 gap-4 sm:grid-cols-[1fr_8rem]">
              <Veld label="Naam in het menu" htmlFor="menu-label" teller={<Teller waarde={v.menu_label} max={MENU_LABEL_MAX} />} uitleg="Leeg = de titel.">
                <input id="menu-label" value={v.menu_label} maxLength={MENU_LABEL_MAX} onChange={(e) => zet({ menu_label: e.target.value })} className={invoerKlasse} placeholder={v.titel} />
              </Veld>
              <Veld label="Volgorde" htmlFor="volgorde" uitleg="Laag = eerst.">
                <input id="volgorde" type="number" inputMode="numeric" step={1} value={v.volgorde} onChange={(e) => zet({ volgorde: e.target.value })} className={invoerKlasse} />
              </Veld>
            </div>
          </section>

          {/* Omslagfoto */}
          <section className={kaart}>
            <h2 className="text-lg font-semibold">Omslagfoto (optioneel)</h2>
            {v.omslag_url && /^https:\/\//.test(v.omslag_url) && (
              // eslint-disable-next-line @next/next/no-img-element -- geüploade of externe foto
              <img src={v.omslag_url} alt={v.omslag_alt} className="aspect-[16/9] w-full rounded-xl object-cover" />
            )}
            <div className="flex flex-wrap items-start gap-2">
              <PaginaUpload map="omslag" label={v.omslag_url ? "Andere foto uploaden" : "Foto uploaden"} onUrl={(u) => zet({ omslag_url: u })} />
              <MediaKiezer
                accept="foto"
                map="paginas"
                titel="Omslagfoto kiezen"
                onKies={(m) => zet({ omslag_url: m.url, ...(v.omslag_alt.trim() || !m.alt ? {} : { omslag_alt: m.alt }) })}
              />
              {v.omslag_url && (
                <button type="button" onClick={() => zet({ omslag_url: "", omslag_alt: "" })} className={`${knopRand} text-red-700 dark:text-red-300`}>
                  Foto weghalen
                </button>
              )}
            </div>
            <Veld label="Of plak een adres (https://…)" htmlFor="omslag-url" uitleg="JPG, PNG, GIF of WebP, maximaal 5 MB bij uploaden. Liefst liggend (16:9). Wordt ook gebruikt als deelafbeelding.">
              <input id="omslag-url" type="url" inputMode="url" value={v.omslag_url} onChange={(e) => zet({ omslag_url: e.target.value.trim() })} className={invoerKlasse} placeholder="https://…" />
            </Veld>
            <Veld label="Omschrijving van de foto" htmlFor="omslag-alt" teller={<Teller waarde={v.omslag_alt} max={300} />} uitleg="Kort beschrijven wat er op de foto staat (voor slechtzienden en Google).">
              <input id="omslag-alt" value={v.omslag_alt} maxLength={300} onChange={(e) => zet({ omslag_alt: e.target.value })} className={invoerKlasse} />
            </Veld>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {/* Publiceren */}
          <section className={kaart}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Publiceren</h2>
              <StatusBadge status={opgeslagen.status} />
            </div>
            <p className={`text-sm ${zacht}`}>
              {online
                ? "Deze pagina staat online. Wijzigingen zijn zichtbaar zodra je opslaat."
                : "Deze pagina is een concept en alleen voor jou zichtbaar (ook niet in het menu)."}
            </p>
            {problemen.length > 0 && (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-medium">Nog te doen voordat je kunt publiceren:</p>
                <ul className="mt-1 list-disc pl-5">
                  {problemen.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                {plekken.length > 0 && (
                  <p className="mt-2 text-xs">
                    Invulplekken zoals <code>[aan te vullen: …]</code> en <code>[foto: …]</code> zijn aanwijzingen voor jou: vul ze in of haal ze weg. Een fotoplek
                    vervang je door de cursor op die regel te zetten en op 📷 Foto te klikken.
                  </p>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {!online && (
                <button type="button" onClick={nuPubliceren} disabled={!kanPubliceren} className={`${knopHoofd} w-fit`}>
                  {bezig === "publiceren" ? (
                    <>
                      <Draaier /> Publiceren…
                    </>
                  ) : (
                    "Publiceren"
                  )}
                </button>
              )}
              {online && (
                <button type="button" onClick={offline} disabled={Boolean(bezig)} className={`${knopRand} w-fit`}>
                  Offline halen (terug naar concept)
                </button>
              )}
            </div>
          </section>

          {/* Google */}
          <section className={kaart}>
            <h2 className="text-lg font-semibold">Vindbaarheid in Google</h2>
            <p className={`text-xs ${zacht}`}>Laat je deze velden leeg, dan gebruikt de site de titel en de intro.</p>
            <Veld label="SEO-titel" htmlFor="seo-titel" teller={<Teller waarde={v.seo_titel} max={SEO_TITEL_MAX} />}>
              <input id="seo-titel" value={v.seo_titel} maxLength={70} onChange={(e) => zet({ seo_titel: e.target.value })} className={invoerKlasse} placeholder={v.titel} />
            </Veld>
            <Veld label="SEO-omschrijving" htmlFor="seo-omschrijving" teller={<Teller waarde={v.seo_omschrijving} max={SEO_OMSCHRIJVING_MAX} />}>
              <textarea id="seo-omschrijving" value={v.seo_omschrijving} maxLength={170} rows={3} onChange={(e) => zet({ seo_omschrijving: e.target.value })} className={invoerKlasse} />
            </Veld>
            <Vinkje
              checked={v.niet_indexeren}
              onChange={(b) => zet({ niet_indexeren: b })}
              titel="Niet tonen in Google"
              uitleg="De pagina blijft bereikbaar via een link, maar zoekmachines nemen hem niet op (en hij staat niet in de sitemap)."
            />
            <div className="flex min-w-0 flex-col gap-1">
              <span className={`text-xs ${zacht}`}>Zo ongeveer zie je de pagina in Google:</span>
              <GoogleVoorbeeld titel={v.seo_titel || v.titel} url={url} omschrijving={paginaOmschrijving(v)} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
