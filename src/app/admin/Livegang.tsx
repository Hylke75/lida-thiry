import Link from "next/link";
import { productieCheck } from "@/lib/productie-check";
import type { LivegangItem } from "@/lib/livegang";
import { tekstFout, tekstSucces } from "@/components/admin/stijl";

function Teken({ item }: { item: LivegangItem }) {
  if (item.ok) {
    return (
      <span aria-label="in orde" className={tekstSucces}>
        ✓
      </span>
    );
  }
  return item.niveau === "verplicht" ? (
    <span aria-label="nog niet in orde" className={tekstFout}>
      ✗
    </span>
  ) : (
    <span aria-label="aanbevolen" className="text-amber-700 dark:text-amber-400">
      !
    </span>
  );
}

/** Kaart "Klaar voor livegang" met wat er nog moet gebeuren. */
export async function Livegang() {
  const { items, klaar, allesKlaar, openVerplicht, openAanbevolen } = await productieCheck();
  const open = items.filter((i) => !i.ok);
  const inOrde = items.filter((i) => i.ok);

  const kop = allesKlaar
    ? "Alles klaar ✓"
    : klaar
      ? `Klaar, met ${openAanbevolen} ${openAanbevolen === 1 ? "aanbeveling" : "aanbevelingen"}`
      : `Nog ${openVerplicht} ${openVerplicht === 1 ? "punt" : "punten"} te doen`;

  return (
    <section
      aria-labelledby="livegang-kop"
      className={`flex flex-col gap-3 rounded-2xl border p-4 sm:p-5 ${
        klaar
          ? "border-emerald-600/30 bg-emerald-50/60 dark:border-emerald-400/30 dark:bg-emerald-950/20"
          : "border-black/10 bg-kaart dark:border-white/15"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="livegang-kop" className="text-lg">
          Klaar voor livegang
        </h2>
        <span
          className={`text-sm font-medium ${
            klaar ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"
          }`}
        >
          {kop}
        </span>
      </div>

      {allesKlaar ? (
        <p className="text-sm text-foreground/70">
          Alle {items.length} controles zijn in orde. De site kan live.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
          {open.map((i) => (
            <li key={i.id} className="flex gap-3 py-2.5 text-sm">
              <span className="w-4 shrink-0 text-center font-semibold">
                <Teken item={i} />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-medium">
                  {i.label}
                  {i.niveau === "aanbevolen" && (
                    <span className="ml-2 text-xs font-normal text-foreground/70">(aanbevolen)</span>
                  )}
                </span>
                {i.detail && <span className="break-words text-foreground/70">{i.detail}</span>}
                {i.links.length > 0 && (
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    {i.links.map((l) => (
                      <Link key={l.href} href={l.href} className="text-accent underline underline-offset-2">
                        {l.label} →
                      </Link>
                    ))}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {!allesKlaar && inOrde.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-foreground/70">
            {inOrde.length} {inOrde.length === 1 ? "controle is" : "controles zijn"} al in orde
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {inOrde.map((i) => (
              <li key={i.id} className="flex gap-3">
                <span className="w-4 shrink-0 text-center font-semibold">
                  <Teken item={i} />
                </span>
                <span>{i.label}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
