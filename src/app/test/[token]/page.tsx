import Link from "next/link";
import { beoordeelToken } from "@/lib/test-order";
import { leesMeetBeelden } from "@/lib/meetbeelden";
import { TestWizard } from "./TestWizard";

export const dynamic = "force-dynamic";

function Melding({ titel, tekst, pdfUrl }: { titel: string; tekst: string; pdfUrl?: string }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{titel}</h1>
      <p className="text-black/60 dark:text-white/60">{tekst}</p>
      {pdfUrl && (
        <a
          href={pdfUrl}
          className="mx-auto rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Download je advies (PDF)
        </a>
      )}
      <Link
        href="/"
        className="mx-auto text-sm text-black/50 underline underline-offset-4 hover:text-black/80 dark:text-white/50"
      >
        ← Naar de startpagina
      </Link>
    </main>
  );
}

export default async function TestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const b = await beoordeelToken(token);

  switch (b.toestand) {
    case "onbekend":
      return <Melding titel="Testlink onbekend" tekst="We herkennen deze testlink niet. Controleer de link uit je e-mail." />;
    case "verlopen":
      return <Melding titel="Testlink verlopen" tekst="Deze testlink is verlopen. Neem contact op als je alsnog de test wilt doen." />;
    case "niet_betaald":
      return <Melding titel="Betaling nog niet afgerond" tekst="Zodra je betaling is bevestigd, kun je de test starten." />;
    case "al_afgerond":
      return (
        <Melding
          titel="Test al afgerond"
          tekst={
            b.order.toegekend_type
              ? `Je hebt de test al ingevuld; jouw type is ${b.order.toegekend_type}. Download hieronder je persoonlijke advies.`
              : "Je hebt de test al ingevuld. Je advies ontvang je per e-mail."
          }
          pdfUrl={b.order.toegekend_type ? `/api/test/${token}/pdf` : undefined}
        />
      );
    case "geldig":
      return <TestWizard token={token} klantnaam={b.order.klantnaam} meetBeelden={await leesMeetBeelden()} />;
  }
}
