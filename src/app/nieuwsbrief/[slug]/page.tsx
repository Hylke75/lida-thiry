import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AanmeldFormulier } from "@/components/AanmeldFormulier";
import { leesSectie } from "@/lib/inhoud/lees";
import { opmaakNaarTekst } from "@/lib/inhoud/opmaak";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { haalActiefFormulier } from "@/lib/nieuwsbrief/formulieren";
import { geldigeFormulierSlug, type Formulier } from "@/lib/nieuwsbrief/formulierregels";

// Landingspagina voor een aanmeldformulier met "eigen pagina" aan
// (Beheer → Nieuwsbrief → Formulieren). De vaste routes /nieuwsbrief/bevestig/…
// en /nieuwsbrief/afmelden/… gaan voor; die slugs zijn ook niet te kiezen.
export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function landingsFormulier(slug: string): Promise<Formulier | null> {
  if (!geldigeFormulierSlug(slug)) return null;
  const f = await haalActiefFormulier(slug).catch(() => null);
  return f?.eigen_pagina ? f : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const f = await landingsFormulier(slug);
  if (!f) return { title: "Pagina niet gevonden", robots: { index: false } };
  const titel = f.titel.trim() || "Aanmelden voor de nieuwsbrief";
  const omschrijving = opmaakNaarTekst(f.tekst).trim().slice(0, 160) || undefined;
  return {
    title: titel,
    description: omschrijving,
    alternates: { canonical: `/nieuwsbrief/${f.slug}` },
    openGraph: { title: titel, description: omschrijving, url: `/nieuwsbrief/${f.slug}` },
  };
}

export default async function FormulierPagina({ params }: { params: Params }) {
  const { slug } = await params;
  const f = await landingsFormulier(slug);
  if (!f) notFound();
  const teksten = await leesSectie(NIEUWSBRIEF_AANMELDEN);

  return (
    <main className="flex w-full flex-1 flex-col items-center justify-center bg-accent-zacht/40 px-4 py-12 sm:px-6 sm:py-20">
      <div className="flex w-full max-w-2xl flex-col gap-8">
        <p className="text-center font-serif text-lg tracking-tight text-foreground/70">
          <Link href="/" className="hover:text-accent">
            Lida Thiry · Imago &amp; Kledingadvies
          </Link>
        </p>
        <div className="rounded-3xl border border-foreground/10 bg-kaart px-5 py-10 shadow-sm sm:px-10">
          <AanmeldFormulier formulier={f} standaard={teksten} kop="h1" />
        </div>
        <Link href="/" className="mx-auto text-sm text-foreground/50 underline underline-offset-4 hover:text-accent">
          ← Naar de website
        </Link>
      </div>
    </main>
  );
}
