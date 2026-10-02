"use client";

import { verwijderBeeld } from "../acties";

export function VerwijderKnop({ id, code }: { id: string; code: string }) {
  return (
    <form
      action={verwijderBeeld}
      onSubmit={(e) => {
        if (!confirm(`Beeld ${code} definitief verwijderen? Dit kan niet ongedaan worden gemaakt.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="rounded-full border border-red-300 px-5 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40">
        Beeld verwijderen
      </button>
    </form>
  );
}
