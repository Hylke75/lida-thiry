import { notFound } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { haalLichaamstypes } from "@/lib/lichaamstypes";
import { AdminNav } from "../../AdminNav";
import { laad } from "./laad";
import { GroepKop } from "./onderdelen";
import { GegevensKaart, InhoudKaart } from "./Overzicht";
import { aantalBeelden, buren, verdeelSecties, veldGroepen } from "./regels";
import { LeegVeld, SectieKaart } from "./SectieKaart";
import { TypeKop, TypeNavigatie } from "./TypeKop";

export const dynamic = "force-dynamic";

export default async function TypeEditor({
  params,
}: {
  params: Promise<{ sleutel: string }>;
}) {
  await vereisBeheerder("advies");
  const { sleutel: ruw } = await params;
  const sleutel = decodeURIComponent(ruw);
  const geladen = await laad(sleutel);
  if (!geladen) notFound();
  const { type, secties, alle, velden } = geladen;
  const { perVeld, overige } = verdeelSecties(secties);
  const groepen = veldGroepen(velden);
  const letters = (await haalLichaamstypes()).map((t) => ({ letter: t.code, naam: t.naam }));

  const { vorige, volgende } = buren(alle, sleutel);
  const andereTypes = alle.filter((t) => t.sleutel !== sleutel);
  const sectieProps = { sleutel, categorie: type.categorie, andereTypes, letters };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/types" />

      <TypeNavigatie vorige={vorige} volgende={volgende} />

      <TypeKop
        type={type}
        letters={letters}
        ingevuld={perVeld.size}
        aantalVelden={velden.length}
        aantalBeelden={aantalBeelden(secties)}
      />

      {/* Algemene gegevens */}
      <GegevensKaart type={type} />

      {/* Inhoud */}
      <InhoudKaart velden={velden} perVeld={perVeld} />

      {groepen.map((groep) => (
        <div key={groep} className="flex flex-col gap-4">
          <GroepKop>{groep}</GroepKop>
          {velden
            .filter((v) => v.groep === groep)
            .map((v) => {
              const s = perVeld.get(v.sleutel);
              if (!s) return <LeegVeld key={v.sleutel} veld={v} sleutel={sleutel} />;
              return (
                <div
                  key={v.sleutel}
                  id={`veld-${v.sleutel}`}
                  className="scroll-mt-6"
                >
                  <SectieKaart sectie={s} hulp={v.hulptekst} {...sectieProps} />
                </div>
              );
            })}
        </div>
      ))}

      {overige.length > 0 && (
        <div className="flex flex-col gap-4">
          <GroepKop>Overige secties (horen bij geen vast veld)</GroepKop>
          {overige.map((s) => (
            <SectieKaart key={s.id} sectie={s} hulp={null} {...sectieProps} />
          ))}
        </div>
      )}
    </main>
  );
}
