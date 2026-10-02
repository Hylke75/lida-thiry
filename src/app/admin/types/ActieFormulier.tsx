"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import type { Uitkomst } from "./uitkomst";

type Actie = (vorige: Uitkomst | null, fd: FormData) => Promise<Uitkomst>;

/**
 * Formulier dat een serveractie uitvoert en de uitkomst eronder toont.
 * - `bevestig`: vraagt eerst om bevestiging (bijv. bij verwijderen).
 * - `bewaakWijzigingen`: toont 'nog niet opgeslagen' en waarschuwt bij het
 *   verlaten van de pagina zolang er niet-opgeslagen wijzigingen zijn.
 * - `stil`: toont alleen foutmeldingen (voor kleine knoppen zoals verplaatsen).
 * Velden worden na het opslaan niet leeggemaakt, ook niet als het misgaat.
 */
export function ActieFormulier({
  actie,
  bevestig,
  bewaakWijzigingen = false,
  stil = false,
  className,
  children,
}: {
  actie: Actie;
  bevestig?: string;
  bewaakWijzigingen?: boolean;
  stil?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const [uitkomst, voerUit, bezig] = useActionState(actie, null);
  // Aantal wijzigingen sinds het laden, en de stand bij de laatste keer opslaan.
  const [teller, setTeller] = useState(0);
  const [ingediend, setIngediend] = useState(0);
  const gewijzigd = bewaakWijzigingen && teller > (uitkomst?.ok ? ingediend : 0);

  useEffect(() => {
    if (uitkomst?.anker) {
      document.getElementById(uitkomst.anker)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [uitkomst]);

  useEffect(() => {
    if (!gewijzigd) return;
    const waarschuw = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [gewijzigd]);

  function verstuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (bevestig && !window.confirm(bevestig)) return;
    const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    setIngediend(teller);
    startTransition(() => voerUit(fd));
  }

  const toonUitkomst = uitkomst && !(stil && uitkomst.ok);

  return (
    <form
      onSubmit={verstuur}
      onInput={bewaakWijzigingen ? () => setTeller((t) => t + 1) : undefined}
      className={className}
    >
      <fieldset disabled={bezig} className="contents">
        {children}
      </fieldset>
      {(toonUitkomst || gewijzigd || (bezig && !stil)) && (
        <p
          role={uitkomst && !uitkomst.ok ? "alert" : "status"}
          className={`basis-full text-sm ${
            bezig
              ? "text-black/50 dark:text-white/50"
              : uitkomst && !uitkomst.ok
                ? "text-red-700 dark:text-red-300"
                : gewijzigd
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-emerald-700 dark:text-emerald-300"
          }`}
        >
          {bezig
            ? "Bezig…"
            : uitkomst && !uitkomst.ok
              ? uitkomst.melding
              : gewijzigd
                ? "Je hebt wijzigingen die nog niet zijn opgeslagen."
                : `✓ ${uitkomst?.melding}`}
        </p>
      )}
    </form>
  );
}

/** Tekstvak dat meegroeit met de tekst, zodat je niet hoeft te scrollen. */
export function GroeiendTekstvak(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const pasAan = () => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  };
  useLayoutEffect(pasAan, []);
  return (
    <textarea
      {...props}
      ref={ref}
      onInput={(e) => {
        pasAan();
        props.onInput?.(e);
      }}
    />
  );
}
