"use client";

import { useEffect, useEffectEvent, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MediaKiezer } from "@/components/admin/MediaKiezer";
import type { Suggesties } from "@/lib/blog/ai";
import type { Bewerking } from "@/lib/blog/ai-prompt";
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
  leestijdMinuten,
  maakSlug,
  metaOmschrijving,
  normaliseerTags,
  publicatieProblemen,
  valideerBericht,
  woorden,
  type BlogBericht,
  type Zichtbaarheid,
} from "@/lib/blog/regels";
import { toonDatumTijd } from "@/lib/nieuwsbrief/tijd";
import { aiBewerk, aiVoorstel, alsNieuwsbrief, naarConcept, publiceer, slaBerichtOp, type BerichtUitkomst } from "../acties";
import { invoerKlasse, kaart, knopHoofd, knopKlein, knopRand, zacht } from "../../nieuwsbrief/_editor/stijl";
import { Geschiedenis } from "../../versies/Geschiedenis";
import { zetBerichtVersieTerug } from "../../versies/acties";
import { ArtikelTekst } from "./Artikel";
import { BlogUpload } from "./BlogUpload";
import { AiBadge, ZichtbaarheidBadge } from "./badges";
import { TagInvoer } from "./TagInvoer";

interface Velden {
  titel: string;
  slug: string;
  samenvatting: string;
  inhoud: string;
  omslag_url: string;
  omslag_alt: string;
  categorie: string;
  tags: string[];
  seo_titel: string;
  seo_omschrijving: string;
  auteur: string;
  uitgelicht: boolean;
}

function alsVelden(b: BlogBericht): Velden {
  return {
    titel: b.titel,
    slug: b.slug,
    samenvatting: b.samenvatting,
    inhoud: b.inhoud,
    omslag_url: b.omslag_url ?? "",
    omslag_alt: b.omslag_alt,
    categorie: b.categorie ?? "",
    tags: b.tags,
    seo_titel: b.seo_titel,
    seo_omschrijving: b.seo_omschrijving,
    auteur: b.auteur,
    uitgelicht: b.uitgelicht,
  };
}

const alsInvoer = (v: Velden) => ({ ...v, omslag_url: v.omslag_url.trim() || null, categorie: v.categorie.trim() || null });

const BEWERKING_LABEL: Record<Bewerking, string> = {
  verbeter: "Verbeteren",
  korter: "Korter",
  langer: "Langer",
  eenvoudiger: "Eenvoudiger",
  persoonlijker: "Persoonlijker",
};

const WERKBALK: { knop: Opmaakknop; label: ReactNode; titel: string }[] = [
  { knop: "kop", label: "Kop", titel: "Tussenkop (## aan het begin van de regel)" },
  { knop: "subkop", label: "Subkop", titel: "Kleinere kop (###)" },
  { knop: "vet", label: <strong>Vet</strong>, titel: "Vetgedrukt (**tekst**)" },
  { knop: "lijst", label: "• Lijst", titel: "Opsomming (- aan het begin van de regel)" },
  { knop: "link", label: "Link", titel: "Link: [tekst](https://…)" },
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

function Draaier() {
  return <span aria-hidden className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-3px]" />;
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
      {uitleg && <p className={`text-xs ${zacht}`}>{uitleg}</p>}
    </div>
  );
}

/** Zo ongeveer toont Google het bericht in de zoekresultaten. */
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

interface AiVoorstelTekst {
  bewerking: Bewerking;
  start: number;
  eind: number;
  voor: string;
  na: string;
  geheel: boolean;
}

export function BlogEditor({
  bericht,
  beginZichtbaar,
  categorieen,
  bekendeTags,
  aiAan,
  site,
  standaardMoment,
}: {
  bericht: BlogBericht;
  beginZichtbaar: Zichtbaarheid;
  categorieen: string[];
  bekendeTags: string[];
  aiAan: boolean;
  site: string;
  standaardMoment: string;
}) {
  const router = useRouter();
  const [opgeslagen, setOpgeslagen] = useState(bericht);
  const [zichtbaar, setZichtbaar] = useState(beginZichtbaar);
  const [v, setV] = useState<Velden>(() => alsVelden(bericht));
  const [gewijzigd, setGewijzigd] = useState(false);
  const [slugAuto, setSlugAuto] = useState(
    beginZichtbaar === "concept" && (bericht.slug === maakSlug(bericht.titel) || /^nieuw-bericht(-\d+)?$/.test(bericht.slug)),
  );
  const [bezig, setBezig] = useState<string | null>(null);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string[] } | null>(null);
  const [tab, setTab] = useState<"schrijven" | "voorbeeld">("schrijven");
  const [foto, setFoto] = useState<{ alt: string } | null>(null);
  const [moment, setMoment] = useState(standaardMoment);
  const [gecontroleerd, setGecontroleerd] = useState(false);
  const [aiBezig, setAiBezig] = useState<string | null>(null);
  const [aiFout, setAiFout] = useState<string | null>(null);
  const [aiTekst, setAiTekst] = useState<AiVoorstelTekst | null>(null);
  const [suggesties, setSuggesties] = useState<Suggesties | null>(null);
  const tekstvak = useRef<HTMLTextAreaElement>(null);
  const aiPaneel = useRef<HTMLDivElement>(null);

  const id = opgeslagen.id;
  const url = `${site}/blog/${v.slug || maakSlug(v.titel)}`;
  const aantalWoorden = woorden(v.inhoud);
  const plekken = useMemo(() => vindPlaatshouders(v.inhoud), [v.inhoud]);
  const validatie = useMemo(() => valideerBericht(alsInvoer(v)), [v]);
  const problemen = useMemo(
    () => [...(validatie.ok ? [] : validatie.fouten), ...publicatieProblemen({ titel: v.titel, inhoud: v.inhoud, samenvatting: v.samenvatting })],
    [validatie, v.titel, v.inhoud, v.samenvatting],
  );
  const nogTeControleren = opgeslagen.ai_gegenereerd && !opgeslagen.ai_opdracht?.gecontroleerd_op;
  const omslagSuggestie = typeof opgeslagen.ai_opdracht?.omslag_suggestie === "string" ? opgeslagen.ai_opdracht.omslag_suggestie : "";

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
  const zetTitel = (titel: string) => zet(slugAuto ? { titel, slug: maakSlug(titel) } : { titel });

  /** Verwerkt het antwoord van de server; met `alleenStatus` blijft niet-opgeslagen tekst in de editor staan. */
  function verwerk(r: BerichtUitkomst, alleenStatus = false) {
    if (r.ok) {
      setOpgeslagen(r.bericht);
      setZichtbaar(r.zichtbaar);
      if (alleenStatus) {
        setMelding({ soort: "ok", tekst: [r.melding, "Let op: je andere wijzigingen zijn nog niet opgeslagen."] });
        router.refresh();
        return;
      }
      setV(alsVelden(r.bericht));
      setGewijzigd(false);
      setMelding({ soort: "ok", tekst: [r.melding] });
      if (r.zichtbaar !== "concept") setSlugAuto(false);
      router.refresh();
    } else {
      setMelding({ soort: "fout", tekst: r.fouten });
    }
  }

  async function voerUit(label: string, actie: () => Promise<BerichtUitkomst>, alleenStatus = false) {
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

  const opslaan = () => voerUit("opslaan", () => slaBerichtOp(id, alsInvoer(v)));

  /** Zet een versie uit de geschiedenis terug; null = gelukt, anders de foutmeldingen. */
  async function versieTerugzetten(versieId: string): Promise<string[] | null> {
    const r = await zetBerichtVersieTerug(versieId);
    if (!r.ok) return r.fouten;
    verwerk(r);
    return null;
  }

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

  // AI ------------------------------------------------------------------------------

  async function aiHerschrijf(bewerking: Bewerking) {
    if (aiBezig) return;
    const { start, eind } = selectie();
    const geheel = start === eind || !v.inhoud.slice(start, eind).trim();
    const van = geheel ? 0 : start;
    const tot = geheel ? v.inhoud.length : eind;
    const voor = v.inhoud.slice(van, tot);
    if (!voor.trim()) return setAiFout("Er is nog geen tekst om te bewerken.");
    setAiFout(null);
    setAiTekst(null);
    setAiBezig(`${BEWERKING_LABEL[bewerking]}${geheel ? " (hele tekst)" : " (selectie)"}`);
    try {
      const r = await aiBewerk(id, bewerking, voor);
      if (r.ok) {
        setAiTekst({ bewerking, start: van, eind: tot, voor, na: r.tekst, geheel });
        requestAnimationFrame(() => aiPaneel.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      } else setAiFout(r.fouten.join(" "));
    } catch {
      setAiFout("De AI reageerde niet op tijd of de verbinding viel weg. Probeer het opnieuw, eventueel met een kleiner stuk tekst.");
    } finally {
      setAiBezig(null);
    }
  }

  function aiOvernemen() {
    if (!aiTekst) return;
    let start = aiTekst.start;
    if (v.inhoud.slice(start, aiTekst.eind) !== aiTekst.voor) {
      start = v.inhoud.indexOf(aiTekst.voor);
      if (start === -1 || v.inhoud.indexOf(aiTekst.voor, start + 1) !== -1) {
        return setAiFout("De tekst is intussen veranderd, waardoor het voorstel niet meer automatisch past. Kopieer het voorstel zelf, of vraag het opnieuw.");
      }
    }
    const eind = start + aiTekst.voor.length;
    zet({ inhoud: v.inhoud.slice(0, start) + aiTekst.na + v.inhoud.slice(eind) });
    setAiTekst(null);
    selecteer(start, start + aiTekst.na.length);
  }

  async function aiSuggesties() {
    if (aiBezig) return;
    setAiFout(null);
    setSuggesties(null);
    setAiBezig("Titels & SEO bedenken");
    try {
      const r = await aiVoorstel(id, v.titel, v.inhoud);
      if (r.ok) setSuggesties(r.suggesties);
      else setAiFout(r.fouten.join(" "));
    } catch {
      setAiFout("De AI reageerde niet op tijd of de verbinding viel weg. Probeer het opnieuw.");
    } finally {
      setAiBezig(null);
    }
  }

  // Publiceren ------------------------------------------------------------------------

  const kanPubliceren = problemen.length === 0 && (!nogTeControleren || gecontroleerd) && !bezig;

  const nuPubliceren = () => {
    if (!confirm(zichtbaar === "ingepland" ? "Het bericht nu meteen publiceren in plaats van op het geplande moment?" : "Het bericht nu publiceren? Het is daarna direct zichtbaar op je website.")) return;
    void voerUit("publiceren", () => publiceer(id, alsInvoer(v), { moment: null, gecontroleerd }));
  };
  const inplannen = () => void voerUit("inplannen", () => publiceer(id, alsInvoer(v), { moment, gecontroleerd }));
  const terugNaarConcept = () => {
    if (gewijzigd && !confirm("Je hebt wijzigingen die nog niet zijn opgeslagen. Die blijven in de editor staan; vergeet niet daarna op te slaan. Doorgaan?")) return;
    if (zichtbaar === "online" && !confirm("Het bericht offline halen? Het is dan niet meer te zien op je website.")) return;
    // Niet-opgeslagen tekst blijft staan: dan alleen de nieuwe status overnemen.
    void voerUit("concept", () => naarConcept(id), gewijzigd);
  };

  // Weergave ------------------------------------------------------------------------

  const schrijfKolom = tab === "schrijven" ? "flex" : "hidden lg:flex";
  const voorbeeldKolom = tab === "voorbeeld" ? "flex" : "hidden lg:flex";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Vaste balk met status en opslaan. */}
      <div className="sticky top-0 z-20 -mx-4 flex flex-wrap items-center justify-between gap-2 border-b border-black/10 bg-background/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 dark:border-white/15">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
          <ZichtbaarheidBadge status={zichtbaar} />
          {opgeslagen.ai_gegenereerd && <AiBadge />}
          {zichtbaar === "ingepland" && <span className={zacht}>verschijnt {toonDatumTijd(opgeslagen.gepubliceerd_op)}</span>}
          <span className={gewijzigd ? "font-medium text-amber-700 dark:text-amber-300" : zacht}>
            {gewijzigd ? "● Niet opgeslagen" : "Alles opgeslagen"}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Geschiedenis soort="blog" refId={id} onTerugzetten={versieTerugzetten} gewijzigd={gewijzigd} knopKlasse={knopRand} />
          {zichtbaar === "online" && !gewijzigd ? (
            <a href={`/blog/${opgeslagen.slug}`} target="_blank" rel="noopener noreferrer" className={knopRand}>
              Bekijken ↗
            </a>
          ) : (
            <Link href={`/admin/blog/${id}/voorbeeld`} className={knopRand} title={gewijzigd ? "Het voorbeeld toont de laatst opgeslagen versie" : undefined}>
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

      {/* Titel */}
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
          placeholder="Bijv. Zo kies je de perfecte jurk voor jouw figuur"
        />
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

        {(aiBezig || aiFout || aiTekst) && (
          <div ref={aiPaneel} className="scroll-mt-20">
            {aiBezig && (
              <p role="status" className="flex items-center gap-2 rounded-lg bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
                <Draaier /> De AI is bezig: {aiBezig}… Dit kan een halve tot anderhalve minuut duren. Je kunt intussen gewoon verder werken.
              </p>
            )}
            {aiFout && <Meldingen soort="fout" tekst={[aiFout]} />}
            {aiTekst && (
              <div className={`${kaart} border-violet-300 dark:border-violet-700`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">
                    Voorstel van de AI: {BEWERKING_LABEL[aiTekst.bewerking].toLowerCase()} {aiTekst.geheel ? "(hele tekst)" : "(selectie)"}
                  </h2>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setAiTekst(null)} className={knopRand}>
                      Annuleren
                    </button>
                    <button type="button" onClick={aiOvernemen} className={knopHoofd}>
                      Overnemen
                    </button>
                  </div>
                </div>
                <p className={`text-xs ${zacht}`}>
                  Lees het voorstel kritisch. Er verandert pas iets aan je tekst als je op Overnemen klikt (en daarna opslaat).
                </p>
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-red-700 dark:text-red-400">Nu ({woorden(aiTekst.voor)} woorden)</span>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-red-50 p-3 font-sans text-sm leading-relaxed text-red-950 dark:bg-red-950/30 dark:text-red-100">
                      {aiTekst.voor}
                    </pre>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Voorstel ({woorden(aiTekst.na)} woorden)</span>
                    <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-emerald-50 p-3 font-sans text-sm leading-relaxed text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
                      {aiTekst.na}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-start">
          <div className={`${schrijfKolom} min-w-0 flex-col gap-2`}>
            <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="Opmaak">
              {WERKBALK.map((w) => (
                <button
                  key={w.knop}
                  type="button"
                  title={w.titel}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => werkbalk(w.knop)}
                  className={knopKlein}
                >
                  {w.label}
                </button>
              ))}
              <button type="button" title="Foto uploaden en op de plek van de cursor invoegen" onMouseDown={(e) => e.preventDefault()} onClick={openFoto} className={knopKlein}>
                📷 Foto
              </button>
            </div>

            {foto && (
              <div className="flex min-w-0 flex-col gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-3 dark:border-white/15 dark:bg-white/5">
                <Veld label="Korte omschrijving van de foto" htmlFor="foto-alt" uitleg="Voor slechtzienden en Google. De foto komt op de plek van de cursor (of vervangt de [foto: …]-regel waar de cursor op staat).">
                  <input id="foto-alt" value={foto.alt} maxLength={200} onChange={(e) => setFoto({ alt: e.target.value })} className={invoerKlasse} placeholder="Bijv. Vrouw in een donkerblauwe wikkeljurk" />
                </Veld>
                <div className="flex flex-wrap items-start gap-2">
                  <BlogUpload map="afbeeldingen" label="Foto kiezen en invoegen" disabled={!foto.alt.trim()} onUrl={(u) => fotoIngevoegd(u)} />
                  <MediaKiezer accept="foto" map="blog" knopTekst="Uit mediabibliotheek" titel="Foto invoegen" onKies={(m) => fotoIngevoegd(m.url, m.alt)} />
                  <button type="button" onClick={() => setFoto(null)} className={knopRand}>
                    Annuleren
                  </button>
                </div>
              </div>
            )}

            {aiAan ? (
              <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="AI-hulp">
                <span className={`text-xs ${zacht}`}>✨ AI:</span>
                {(Object.keys(BEWERKING_LABEL) as Bewerking[]).map((b) => (
                  <button
                    key={b}
                    type="button"
                    disabled={Boolean(aiBezig)}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => void aiHerschrijf(b)}
                    className={`${knopKlein} border-violet-300 text-violet-900 dark:border-violet-700 dark:text-violet-200`}
                  >
                    {BEWERKING_LABEL[b]}
                  </button>
                ))}
                <span className={`text-xs ${zacht}`}>— werkt op de geselecteerde tekst, of op alles als er niets geselecteerd is.</span>
              </div>
            ) : null}

            <textarea
              ref={tekstvak}
              id="inhoud"
              aria-label="Tekst van het bericht"
              value={v.inhoud}
              onChange={(e) => zet({ inhoud: e.target.value })}
              rows={24}
              spellCheck
              lang="nl"
              className={`${invoerKlasse} min-h-[50vh] resize-y font-mono text-[13px] leading-relaxed lg:min-h-[70vh]`}
              placeholder={"Schrijf hier je bericht.\n\n## Tussenkop\n\nEen alinea met **vette tekst** en een [link](/bestellen).\n\n- een opsomming\n- nog een punt"}
            />
            <p className={`text-xs ${zacht}`}>
              {aantalWoorden} {aantalWoorden === 1 ? "woord" : "woorden"} · ongeveer {leestijdMinuten(v.inhoud)} min lezen. Opmaak: <code>## kop</code>,{" "}
              <code>### subkop</code>, <code>- lijst</code>, <code>**vet**</code>, <code>[tekst](https://…)</code>, een lege regel voor een nieuwe alinea.
            </p>
          </div>

          <div className={`${voorbeeldKolom} min-w-0 flex-col gap-2 lg:sticky lg:top-20`}>
            <p className={`hidden text-xs lg:block ${zacht}`}>Voorbeeld (werkt direct bij)</p>
            <div className="max-h-none min-w-0 overflow-y-auto rounded-2xl border border-black/10 bg-background p-4 sm:p-6 lg:max-h-[75vh] dark:border-white/15">
              <h1 className="mb-4 break-words text-2xl font-semibold tracking-tight sm:text-3xl">{v.titel || "(nog geen titel)"}</h1>
              {v.inhoud.trim() ? <ArtikelTekst inhoud={v.inhoud} /> : <p className={`text-sm ${zacht}`}>Nog geen tekst.</p>}
            </div>
          </div>
        </div>

        {!aiAan && (
          <p className={`rounded-lg bg-black/[0.03] px-4 py-3 text-xs dark:bg-white/5 ${zacht}`}>
            ✨ De AI-schrijfhulp staat uit. Je webbouwer kan hem aanzetten door in Vercel de omgevingsvariabele <code>ANTHROPIC_API_KEY</code> in te
            stellen (een sleutel van console.anthropic.com) en de site opnieuw te publiceren.
          </p>
        )}
      </section>

      <div className="grid min-w-0 gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Gegevens */}
          <section className={kaart}>
            <h2 className="text-lg font-semibold">Gegevens</h2>
            <Veld
              label="Webadres"
              htmlFor="slug"
              uitleg={
                <>
                  <span className="break-all">{url}</span>
                  {zichtbaar === "online" && v.slug !== opgeslagen.slug && (
                    <span className="mt-1 block font-medium text-amber-700 dark:text-amber-300">
                      Let op: dit bericht staat al online. Met een nieuw webadres werken bestaande links naar het oude adres niet meer.
                    </span>
                  )}
                </>
              }
            >
              <div className="flex gap-2">
                <input
                  id="slug"
                  value={v.slug}
                  maxLength={100}
                  onChange={(e) => {
                    setSlugAuto(false);
                    zet({ slug: e.target.value.toLowerCase().replace(/\s+/g, "-") });
                  }}
                  onBlur={() => {
                    const schoon = maakSlug(v.slug);
                    if (schoon && schoon !== v.slug) zet({ slug: schoon });
                  }}
                  className={invoerKlasse}
                />
                {!slugAuto && maakSlug(v.titel) && maakSlug(v.titel) !== v.slug && (
                  <button type="button" onClick={() => zet({ slug: maakSlug(v.titel) })} className={`${knopRand} shrink-0`} title="Webadres opnieuw maken uit de titel">
                    Uit titel
                  </button>
                )}
              </div>
            </Veld>
            <Veld label="Samenvatting" htmlFor="samenvatting" teller={<Teller waarde={v.samenvatting} max={500} />} uitleg="Een of twee zinnen voor het blogoverzicht (en als voorvertoning in de nieuwsbrief).">
              <textarea id="samenvatting" value={v.samenvatting} maxLength={500} rows={3} onChange={(e) => zet({ samenvatting: e.target.value })} className={invoerKlasse} />
            </Veld>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <Veld label="Categorie" htmlFor="categorie" uitleg="Kies een bestaande of typ een nieuwe.">
                <input id="categorie" value={v.categorie} maxLength={60} list="blog-categorieen" onChange={(e) => zet({ categorie: e.target.value })} className={invoerKlasse} placeholder="Bijv. Stijladvies" />
                <datalist id="blog-categorieen">
                  {categorieen.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Veld>
              <Veld label="Auteur" htmlFor="auteur">
                <input id="auteur" value={v.auteur} maxLength={80} onChange={(e) => zet({ auteur: e.target.value })} className={invoerKlasse} />
              </Veld>
            </div>
            <Veld label="Tags" htmlFor="tags">
              <TagInvoer id="tags" waarde={v.tags} suggesties={bekendeTags} onChange={(tags) => zet({ tags })} />
            </Veld>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={v.uitgelicht} onChange={(e) => zet({ uitgelicht: e.target.checked })} className="mt-0.5 size-4 accent-[var(--accent)]" />
              <span>
                <span className="font-medium">Uitgelicht</span>
                <span className={`block text-xs ${zacht}`}>Uitgelichte berichten krijgen een prominente plek op de site.</span>
              </span>
            </label>
          </section>

          {/* Omslagfoto */}
          <section className={kaart}>
            <h2 className="text-lg font-semibold">Omslagfoto</h2>
            {omslagSuggestie && !v.omslag_url && (
              <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
                ✨ Idee van de AI voor de omslagfoto: {omslagSuggestie}
              </p>
            )}
            {v.omslag_url && /^https:\/\//.test(v.omslag_url) && (
              // eslint-disable-next-line @next/next/no-img-element -- geüploade of externe foto
              <img src={v.omslag_url} alt={v.omslag_alt} className="aspect-[16/9] w-full rounded-xl object-cover" />
            )}
            <div className="flex flex-wrap items-start gap-2">
              <BlogUpload map="omslag" label={v.omslag_url ? "Andere foto uploaden" : "Foto uploaden"} onUrl={(u) => zet({ omslag_url: u })} />
              <MediaKiezer
                accept="foto"
                map="blog"
                titel="Omslagfoto kiezen"
                onKies={(m) => zet({ omslag_url: m.url, ...(v.omslag_alt.trim() || !m.alt ? {} : { omslag_alt: m.alt }) })}
              />
              {v.omslag_url && (
                <button type="button" onClick={() => zet({ omslag_url: "", omslag_alt: "" })} className={`${knopRand} text-red-700 dark:text-red-300`}>
                  Foto weghalen
                </button>
              )}
            </div>
            <Veld label="Of plak een adres (https://…)" htmlFor="omslag-url" uitleg="JPG, PNG, GIF of WebP, maximaal 5 MB bij uploaden. Liefst liggend (16:9).">
              <input id="omslag-url" type="url" inputMode="url" value={v.omslag_url} onChange={(e) => zet({ omslag_url: e.target.value.trim() })} className={invoerKlasse} placeholder="https://…" />
            </Veld>
            <Veld label="Omschrijving van de foto" htmlFor="omslag-alt" teller={<Teller waarde={v.omslag_alt} max={300} />} uitleg="Kort beschrijven wat er op de foto staat (voor slechtzienden en Google).">
              <input id="omslag-alt" value={v.omslag_alt} maxLength={300} onChange={(e) => zet({ omslag_alt: e.target.value })} className={invoerKlasse} />
            </Veld>
          </section>

          {/* Google */}
          <section className={kaart}>
            <h2 className="text-lg font-semibold">Vindbaarheid in Google</h2>
            <p className={`text-xs ${zacht}`}>Laat je deze velden leeg, dan gebruikt de site de titel en de samenvatting.</p>
            <Veld label="SEO-titel" htmlFor="seo-titel" teller={<Teller waarde={v.seo_titel} max={SEO_TITEL_MAX} />}>
              <input id="seo-titel" value={v.seo_titel} maxLength={70} onChange={(e) => zet({ seo_titel: e.target.value })} className={invoerKlasse} placeholder={v.titel} />
            </Veld>
            <Veld label="SEO-omschrijving" htmlFor="seo-omschrijving" teller={<Teller waarde={v.seo_omschrijving} max={SEO_OMSCHRIJVING_MAX} />}>
              <textarea id="seo-omschrijving" value={v.seo_omschrijving} maxLength={170} rows={3} onChange={(e) => zet({ seo_omschrijving: e.target.value })} className={invoerKlasse} />
            </Veld>
            <div className="flex min-w-0 flex-col gap-1">
              <span className={`text-xs ${zacht}`}>Zo ongeveer zie je het bericht in Google:</span>
              <GoogleVoorbeeld titel={v.seo_titel || v.titel} url={url} omschrijving={metaOmschrijving(v)} />
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          {/* Publiceren */}
          <section className={kaart}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Publiceren</h2>
              <ZichtbaarheidBadge status={zichtbaar} />
            </div>
            <p className={`text-sm ${zacht}`}>
              {zichtbaar === "online"
                ? `Dit bericht staat online sinds ${toonDatumTijd(opgeslagen.gepubliceerd_op)}. Wijzigingen zijn zichtbaar zodra je opslaat.`
                : zichtbaar === "ingepland"
                  ? `Dit bericht verschijnt automatisch op ${toonDatumTijd(opgeslagen.gepubliceerd_op)}.`
                  : "Dit bericht is een concept en alleen voor jou zichtbaar."}
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
                  <>
                    <p className="mt-2 text-xs">
                      Invulplekken zoals <code>[foto: …]</code> zijn aanwijzingen voor jou. Vervang een fotoplek door een echte foto (zet de cursor op de
                      regel en klik op 📷 Foto), vul de andere aan, of haal ze weg.
                    </p>
                    <ul className="mt-2 flex flex-col gap-1">
                      {plekken.slice(0, 12).map((p) => (
                        <li key={p.start} className="flex min-w-0 items-center justify-between gap-2 text-xs">
                          <code className="min-w-0 truncate">{p.tekst}</code>
                          <button type="button" onClick={() => selecteer(p.start, p.eind)} className={`${knopKlein} shrink-0`}>
                            Aanwijzen
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}

            {nogTeControleren && zichtbaar === "concept" && (
              <label className="flex items-start gap-2 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
                <input type="checkbox" checked={gecontroleerd} onChange={(e) => setGecontroleerd(e.target.checked)} className="mt-0.5 size-4" />
                <span>
                  <span className="font-medium">Ik heb de tekst gelezen en gecontroleerd.</span>
                  <span className="block text-xs">
                    Deze tekst is door AI geschreven. AI kan fouten maken of dingen stellig beweren die niet kloppen. Jij bent verantwoordelijk voor wat er
                    op je site staat.
                  </span>
                </span>
              </label>
            )}

            <div className="flex flex-col gap-3">
              {zichtbaar !== "online" && (
                <button type="button" onClick={nuPubliceren} disabled={!kanPubliceren} className={`${knopHoofd} w-fit`}>
                  {bezig === "publiceren" ? (
                    <>
                      <Draaier /> Publiceren…
                    </>
                  ) : (
                    "Nu publiceren"
                  )}
                </button>
              )}
              {zichtbaar !== "online" && (
                <div className="flex min-w-0 flex-col gap-1">
                  <label htmlFor="moment" className="text-sm font-medium">
                    {zichtbaar === "ingepland" ? "Ander moment kiezen" : "Of inplannen voor later"}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <input id="moment" type="datetime-local" value={moment} onChange={(e) => setMoment(e.target.value)} className={`${invoerKlasse} w-auto`} />
                    <button type="button" onClick={inplannen} disabled={!kanPubliceren || !moment} className={knopRand}>
                      {bezig === "inplannen" ? "Bezig…" : zichtbaar === "ingepland" ? "Planning wijzigen" : "Inplannen"}
                    </button>
                  </div>
                  <p className={`text-xs ${zacht}`}>Nederlandse tijd.</p>
                </div>
              )}
              {zichtbaar !== "concept" && (
                <button type="button" onClick={terugNaarConcept} disabled={Boolean(bezig)} className={`${knopRand} w-fit`}>
                  {zichtbaar === "online" ? "Offline halen (terug naar concept)" : "Planning annuleren (terug naar concept)"}
                </button>
              )}
              {zichtbaar !== "concept" && gewijzigd && <p className={`text-xs ${zacht}`}>Wijzigingen aan een gepubliceerd bericht worden zichtbaar zodra je opslaat.</p>}
            </div>
          </section>

          {/* AI-voorstellen */}
          {aiAan && (
            <section className={kaart}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">✨ Titels &amp; SEO voorstellen</h2>
                <button type="button" onClick={() => void aiSuggesties()} disabled={Boolean(aiBezig) || !v.inhoud.trim()} className={knopRand}>
                  {aiBezig === "Titels & SEO bedenken" ? (
                    <>
                      <Draaier /> Bezig…
                    </>
                  ) : suggesties ? (
                    "Nieuwe voorstellen"
                  ) : (
                    "Voorstellen laten maken"
                  )}
                </button>
              </div>
              <p className={`text-xs ${zacht}`}>De AI leest je tekst en stelt titels, een samenvatting, SEO-teksten en tags voor. Jij kiest wat je gebruikt.</p>
              {suggesties && (
                <div className="flex min-w-0 flex-col gap-4 text-sm">
                  {suggesties.titels.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="font-medium">Titels</p>
                      {suggesties.titels.map((t) => (
                        <Suggestie key={t} tekst={t} gebruikt={v.titel === t} onGebruik={() => zetTitel(t)} />
                      ))}
                    </div>
                  )}
                  {suggesties.samenvatting && (
                    <div className="flex flex-col gap-1.5">
                      <p className="font-medium">Samenvatting</p>
                      <Suggestie tekst={suggesties.samenvatting} gebruikt={v.samenvatting === suggesties.samenvatting} onGebruik={() => zet({ samenvatting: suggesties.samenvatting })} />
                    </div>
                  )}
                  {suggesties.seo_titel && (
                    <div className="flex flex-col gap-1.5">
                      <p className="font-medium">SEO-titel</p>
                      <Suggestie tekst={suggesties.seo_titel} gebruikt={v.seo_titel === suggesties.seo_titel} onGebruik={() => zet({ seo_titel: suggesties.seo_titel.slice(0, 70) })} />
                    </div>
                  )}
                  {suggesties.seo_omschrijving && (
                    <div className="flex flex-col gap-1.5">
                      <p className="font-medium">SEO-omschrijving</p>
                      <Suggestie
                        tekst={suggesties.seo_omschrijving}
                        gebruikt={v.seo_omschrijving === suggesties.seo_omschrijving}
                        onGebruik={() => zet({ seo_omschrijving: suggesties.seo_omschrijving.slice(0, 170) })}
                      />
                    </div>
                  )}
                  {suggesties.tags.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      <p className="font-medium">Tags</p>
                      <Suggestie
                        tekst={suggesties.tags.join(", ")}
                        gebruikt={suggesties.tags.every((t) => v.tags.includes(t))}
                        label="Toevoegen"
                        onGebruik={() => zet({ tags: normaliseerTags([...v.tags, ...suggesties.tags]) })}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Nieuwsbrief */}
          <section className={kaart}>
            <h2 className="text-lg font-semibold">Als nieuwsbrief versturen</h2>
            <p className={`text-sm ${zacht}`}>
              Maakt een nieuwe campagne met de omslagfoto, de titel, de samenvatting, het begin van de tekst en een knop &quot;Lees verder&quot; naar dit bericht. Je
              kunt de campagne daarna nog aanpassen en kiest zelf wanneer en naar wie hij gaat.
            </p>
            {zichtbaar === "concept" ? (
              <p className={`text-xs ${zacht}`}>Beschikbaar zodra het bericht online staat of is ingepland.</p>
            ) : (
              <form action={alsNieuwsbrief} className="flex flex-col gap-1">
                <input type="hidden" name="id" value={id} />
                <button disabled={gewijzigd || Boolean(bezig)} className={`${knopRand} w-fit`}>
                  Nieuwsbrief maken van dit bericht
                </button>
                {gewijzigd && <p className={`text-xs ${zacht}`}>Sla eerst je wijzigingen op.</p>}
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function Suggestie({ tekst, gebruikt, label = "Gebruiken", onGebruik }: { tekst: string; gebruikt: boolean; label?: string; onGebruik: () => void }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-2 rounded-lg bg-black/[0.03] px-3 py-2 dark:bg-white/5">
      <span className="min-w-0 break-words">{tekst}</span>
      <button type="button" onClick={onGebruik} disabled={gebruikt} className={`${knopKlein} shrink-0`}>
        {gebruikt ? "✓ Gebruikt" : label}
      </button>
    </div>
  );
}
