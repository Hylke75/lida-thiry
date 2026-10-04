import { beslismoment, bepaalWinnaar, type AbInstelling, type Variant, type VariantCijfers } from "@/lib/nieuwsbrief/ab-test";
import { toonPercentage } from "@/lib/nieuwsbrief/rapport";
import { toonDatumTijd } from "@/lib/nieuwsbrief/tijd";
import { kaart, knopHoofd, zacht } from "../../../_editor/stijl";
import { kiesWinnaarNuFormulier } from "../../acties";

function Kolom({
  variant,
  onderwerp,
  c,
  winnaar,
  leidt,
}: {
  variant: Variant;
  onderwerp: string;
  c: VariantCijfers;
  winnaar: boolean;
  leidt: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-col gap-2 rounded-xl border p-3 ${
        winnaar ? "border-accent bg-accent-zacht/60" : "border-black/10 dark:border-white/15"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold dark:bg-white/10">Onderwerp {variant.toUpperCase()}</span>
        {winnaar && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-white">Winnaar</span>}
        {!winnaar && leidt && <span className={`text-xs ${zacht}`}>staat voor</span>}
      </div>
      <p className="break-words text-sm font-medium">{onderwerp}</p>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <div>
          <dt className={`text-xs ${zacht}`}>Verzonden</dt>
          <dd className="font-semibold tabular-nums">{c.verzonden.toLocaleString("nl-NL")}</dd>
        </div>
        <div>
          <dt className={`text-xs ${zacht}`}>Geopend</dt>
          <dd className="font-semibold tabular-nums">
            {c.geopend.toLocaleString("nl-NL")} <span className={`text-xs font-normal ${zacht}`}>{toonPercentage(c.geopend, c.verzonden)}</span>
          </dd>
        </div>
        <div>
          <dt className={`text-xs ${zacht}`}>Geklikt</dt>
          <dd className="font-semibold tabular-nums">
            {c.geklikt.toLocaleString("nl-NL")} <span className={`text-xs font-normal ${zacht}`}>{toonPercentage(c.geklikt, c.verzonden)}</span>
          </dd>
        </div>
      </dl>
      {c.wachtrij > 0 && <p className={`text-xs ${zacht}`}>Nog {c.wachtrij} in de wachtrij.</p>}
    </div>
  );
}

/** A/B-test van het onderwerp: A en B naast elkaar, de (voorlopige) winnaar en "Kies winnaar nu". */
export function AbTest({
  id,
  onderwerpA,
  ab,
  winnaar,
  status,
  cijfers,
}: {
  id: string;
  onderwerpA: string;
  ab: AbInstelling;
  winnaar: Variant | null;
  status: string;
  cijfers: Record<Variant, VariantCijfers>;
}) {
  const voorlopig = bepaalWinnaar(cijfers.a, cijfers.b);
  const moment = beslismoment(cijfers.a, cijfers.b, ab.wachtUren);
  const kanKiezen = !winnaar && (status === "bezig" || status === "gepauzeerd");
  return (
    <section className={kaart} aria-labelledby="ab-kop">
      <h2 id="ab-kop" className="text-lg font-semibold">
        A/B-test onderwerp
      </h2>
      <p className={`text-sm ${zacht}`}>
        Testgroep: {ab.percentage}% van de doelgroep ({ab.percentage / 2}% per onderwerp), wachttijd {ab.wachtUren} uur.{" "}
        {winnaar
          ? `Onderwerp ${winnaar.toUpperCase()} heeft gewonnen; de rest van de doelgroep kreeg dat onderwerp. Hieronder staan alleen de cijfers van de testgroep.`
          : moment && moment.getTime() > 0
            ? `De winnaar wordt gekozen bij de eerste verzendronde na ${toonDatumTijd(moment.toISOString())}.`
            : "De winnaar wordt gekozen zodra de testgroep is verstuurd en de wachttijd voorbij is."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Kolom variant="a" onderwerp={onderwerpA} c={cijfers.a} winnaar={winnaar === "a"} leidt={!winnaar && voorlopig.reden !== "gelijk" && voorlopig.winnaar === "a"} />
        <Kolom variant="b" onderwerp={ab.onderwerpB} c={cijfers.b} winnaar={winnaar === "b"} leidt={!winnaar && voorlopig.reden !== "gelijk" && voorlopig.winnaar === "b"} />
      </div>
      <p className={`text-xs ${zacht}`}>
        De winnaar is het onderwerp met het hoogste percentage unieke opens; bij gelijkspel telt het klikpercentage, en is
        dat ook gelijk, dan wint A.
      </p>
      {kanKiezen && (
        <form action={kiesWinnaarNuFormulier}>
          <input type="hidden" name="id" value={id} />
          <button className={knopHoofd}>Kies winnaar nu</button>
        </form>
      )}
    </section>
  );
}
