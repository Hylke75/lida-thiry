import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { AFGERONDE_STATUSSEN, BETAALDE_STATUSSEN, OMZET_STATUSSEN } from "@/lib/admin/status";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { ontleedTypeSleutel } from "@/lib/lichaamstype-regels";
import { formatteerBedrag } from "@/lib/prijs";
import { kaartVlak } from "@/components/admin/stijl";

interface DashOrder {
  status: string;
  bedrag_cent: number | null;
  toegekend_type: string | null;
}

const CATEGORIEEN = Array.from({ length: 12 }, (_, i) => String(i + 1));

/** Haalt alle bestellingen op (in blokken, Supabase geeft er max. 1000 per keer). */
async function leesOrders(dagen: number | null): Promise<DashOrder[]> {
  const supabase = adminClient();
  const vanaf = dagen ? new Date(Date.now() - dagen * 24 * 60 * 60 * 1000).toISOString() : null;
  const uit: DashOrder[] = [];
  const blok = 1000;
  for (let start = 0; ; start += blok) {
    let q = supabase
      .from("orders")
      .select("status, bedrag_cent, toegekend_type")
      .order("aangemaakt_op", { ascending: false })
      .range(start, start + blok - 1);
    if (vanaf) q = q.gte("aangemaakt_op", vanaf);
    const { data, error } = await q;
    if (error) throw new Error(`orders lezen: ${error.message}`);
    uit.push(...((data ?? []) as DashOrder[]));
    if (!data || data.length < blok) break;
  }
  return uit;
}

function Kaart({ titel, waarde, sub }: { titel: string; waarde: string; sub: string }) {
  return (
    <div className={`${kaartVlak} flex flex-col gap-1`}>
      <span className="text-xs uppercase tracking-wide text-foreground/70">{titel}</span>
      <span className="font-serif text-3xl">{waarde}</span>
      <span className="text-xs text-foreground/70">{sub}</span>
    </div>
  );
}

function Balken({ titel, rijen }: { titel: string; rijen: { label: string; aantal: number }[] }) {
  const max = Math.max(1, ...rijen.map((r) => r.aantal));
  return (
    <div className={`${kaartVlak} flex flex-col gap-2`}>
      <span className="text-xs uppercase tracking-wide text-foreground/70">{titel}</span>
      <ul className="flex flex-col gap-1">
        {rijen.map((r) => (
          <li key={r.label} className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2 text-sm">
            <span className="font-mono text-xs">{r.label}</span>
            <span className="h-3 overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
              <span
                className="block h-full rounded-full bg-accent"
                style={{ width: `${(r.aantal / max) * 100}%` }}
              />
            </span>
            <span className="text-right tabular-nums text-foreground/70">{r.aantal}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Kerncijfers bovenaan het overzicht. `periode` = "30" voor de laatste 30 dagen. */
export async function Dashboard({ periode, linkVoor }: { periode: string | undefined; linkVoor: (p?: string) => string }) {
  const dertig = periode === "30";
  const orders = await leesOrders(dertig ? 30 : null);
  const lichaamstypes = await haalLichaamstypes();

  const betaald = orders.filter((o) => BETAALDE_STATUSSEN.includes(o.status));
  const afgerond = orders.filter((o) => AFGERONDE_STATUSSEN.includes(o.status));
  const omzet = orders
    .filter((o) => OMZET_STATUSSEN.includes(o.status))
    .reduce((som, o) => som + (o.bedrag_cent ?? 0), 0);
  const pct = betaald.length ? Math.round((afgerond.length / betaald.length) * 100) : 0;

  const perLetter = new Map<string, number>();
  const perCategorie = new Map<string, number>();
  for (const o of orders) {
    const m = ontleedTypeSleutel(o.toegekend_type ?? "");
    if (!m) continue;
    perCategorie.set(String(m.categorie), (perCategorie.get(String(m.categorie)) ?? 0) + 1);
    perLetter.set(m.code, (perLetter.get(m.code) ?? 0) + 1);
  }

  const knop = (actief: boolean) =>
    `rounded-full px-3 py-1 ${actief ? "bg-foreground text-background" : "text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5"}`;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg">Cijfers</h2>
        <div className="flex gap-1 text-sm">
          <Link href={linkVoor(undefined)} className={knop(!dertig)}>
            Alles
          </Link>
          <Link href={linkVoor("30")} className={knop(dertig)}>
            Laatste 30 dagen
          </Link>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Kaart titel="Bestellingen" waarde={String(orders.length)} sub={`waarvan ${betaald.length} betaald`} />
        <Kaart titel="Omzet" waarde={formatteerBedrag(omzet)} sub="van betaalde bestellingen" />
        <Kaart
          titel="Test ingevuld"
          waarde={`${pct}%`}
          sub={`${afgerond.length} van ${betaald.length} betaalde klanten`}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Balken
          titel="Lichaamstypes"
          rijen={lichaamstypes.map((l) => ({ label: `${l.code} · ${l.naam}`, aantal: perLetter.get(l.code) ?? 0 }))}
        />
        <Balken
          titel="Lengte/maat-categorie"
          rijen={CATEGORIEEN.map((c) => ({ label: c, aantal: perCategorie.get(c) ?? 0 }))}
        />
      </div>
    </section>
  );
}
