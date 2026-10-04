/**
 * Het contactformulier als blok op een pagina ({contactformulier}). Server-
 * component: leest zelf zijn teksten. Wordt ingevuld door de contactmodule.
 */
export async function ContactFormulierBlok({ pagina }: { pagina?: string }) {
  void pagina;
  return (
    <div className="rounded-2xl border border-dashed border-foreground/20 p-6 text-sm text-foreground/60">
      Contactformulier (volgt)
    </div>
  );
}
