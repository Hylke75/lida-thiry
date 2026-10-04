/**
 * Een nieuwsbrief-aanmeldformulier als blok op een pagina. Zonder slug het
 * standaard aanmeldblok ({nieuwsbrief}); met slug een formulier uit Beheer →
 * Nieuwsbrief → Formulieren ({nieuwsbrief_<slug>}). Server-component: leest
 * zelf zijn teksten. Rendert niets als het formulier niet bestaat of uit staat.
 */
export async function NieuwsbriefFormulierBlok({ slug }: { slug?: string }) {
  void slug;
  return (
    <div className="rounded-2xl border border-dashed border-foreground/20 p-6 text-sm text-foreground/60">
      Nieuwsbriefformulier (volgt)
    </div>
  );
}
