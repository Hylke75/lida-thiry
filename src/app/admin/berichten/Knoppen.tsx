"use client";

import { useState, type ComponentProps } from "react";
import { useFormStatus } from "react-dom";

/** Verzendknop die eerst om bevestiging vraagt (bijv. bij verwijderen). */
export function BevestigKnop({ bevestiging, onClick, ...rest }: ComponentProps<"button"> & { bevestiging: string }) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        if (!window.confirm(bevestiging)) e.preventDefault();
        else onClick?.(e);
      }}
    />
  );
}

/** Verzendknop die tijdens het versturen uitgeschakeld is. */
export function VerzendKnop({ children, bezig, ...rest }: ComponentProps<"button"> & { bezig: string }) {
  const { pending } = useFormStatus();
  return (
    <button {...rest} disabled={pending || rest.disabled}>
      {pending ? bezig : children}
    </button>
  );
}

/** Tekstvak met teller. */
export function Tekstvak({ max, begin = "", ...rest }: ComponentProps<"textarea"> & { max: number; begin?: string }) {
  const [lengte, setLengte] = useState(begin.length);
  return (
    <div className="flex flex-col gap-1">
      <textarea
        {...rest}
        defaultValue={begin}
        maxLength={max}
        onChange={(e) => setLengte(e.currentTarget.value.length)}
      />
      <span className="self-end text-xs tabular-nums text-black/50 dark:text-white/50">
        {lengte.toLocaleString("nl-NL")} / {max.toLocaleString("nl-NL")}
      </span>
    </div>
  );
}
