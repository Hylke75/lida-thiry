"use client";

import { verwijderBeeld } from "../acties";
import { knopGevaar } from "@/components/admin/stijl";

export function VerwijderKnop({ id, code }: { id: string; code: string }) {
  return (
    <form
      action={verwijderBeeld}
      onSubmit={(e) => {
        if (!confirm(`Beeld ${code} definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className={knopGevaar}>
        Beeld verwijderen
      </button>
    </form>
  );
}
