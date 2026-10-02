"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Ververst de pagina periodiek tot de betaling door Mollie is bevestigd. */
export function AutoVernieuwen({ seconden = 3 }: { seconden?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconden * 1000);
    return () => clearInterval(t);
  }, [router, seconden]);
  return null;
}
