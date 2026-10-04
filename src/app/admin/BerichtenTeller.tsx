"use client";

import { useEffect, useState } from "react";
import { telNieuweBerichten } from "./berichtenTeller.actie";

/**
 * Klein rondje met het aantal nieuwe contactberichten (niets als er geen zijn).
 * Haalt het aantal op via een serveractie, zodat de navigatie ook vanuit
 * client-componenten geïmporteerd kan worden.
 */
export function BerichtenTeller() {
  const [aantal, setAantal] = useState(0);
  useEffect(() => {
    let actief = true;
    telNieuweBerichten().then(
      (n) => actief && setAantal(n),
      () => undefined,
    );
    return () => {
      actief = false;
    };
  }, []);
  if (!aantal) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-5 text-white">
      <span className="sr-only">nieuw: </span>
      {aantal > 99 ? "99+" : aantal}
    </span>
  );
}
