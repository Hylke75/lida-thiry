"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Toont de inhoud overal behalve in het beheer (/admin), dat een eigen navigatie heeft. */
export function AlleenPubliek({ children }: { children: ReactNode }) {
  const pad = usePathname();
  if (pad === "/admin" || pad?.startsWith("/admin/")) return null;
  return children;
}
