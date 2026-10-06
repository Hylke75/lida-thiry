import Link from "next/link";
import { vereisBeheerder } from "@/lib/admin-auth";
import { leesMeetBeeldRijen } from "@/lib/meetbeelden";
import { leesSectieVers } from "@/lib/inhoud/lees";
import { TEST_MATEN, maatVeldenMetTeksten } from "@/lib/inhoud/groepen/test";
import { Lichaam } from "@/components/Lichaam";
import { AdminNav, Melding } from "../AdminNav";
import { FotoUpload } from "./FotoUpload";
import { verwijderFoto } from "./acties";
import { kaartVlak, knopSecundair } from "@/components/admin/stijl";
import { AdminKop } from "@/components/admin/AdminKop";

export const dynamic = "force-dynamic";

export default async function MeetinstructiesPagina({
  searchParams,
}: {
  searchParams: Promise<{ verwijderd?: string }>;
}) {
  await vereisBeheerder("advies");
  const { verwijderd } = await searchParams;
  const [beelden, maten] = await Promise.all([leesMeetBeeldRijen(), leesSectieVers(TEST_MATEN)]);
  const maatVelden = maatVeldenMetTeksten(maten);
  const verwijderdLabel = maatVelden.find((v) => v.sleutel === verwijderd)?.label;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/meetinstructies" />
      <AdminKop
        titel="Meetinstructies"
        beschrijving="Bij elke maat ziet de klant in de test een tekening van hoe ze moet meten. Upload hier een eigen foto om die tekening te vervangen. Een JPG-, PNG- of WebP-foto van maximaal 5 MB. Verwijder je de foto, dan wordt de tekening weer gebruikt."
      >
        <p className="text-sm">
          <Link href="/admin/teksten/test#test-maten" className="text-accent underline underline-offset-2">
            Teksten van de metingen aanpassen
          </Link>
        </p>
      </AdminKop>

      {verwijderdLabel && <Melding soort="ok">De foto bij &lsquo;{verwijderdLabel}&rsquo; is verwijderd.</Melding>}

      <ul className="flex flex-col gap-4">
        {maatVelden.map((v) => {
          const beeld = beelden[v.sleutel];
          const label = v.label.replace(" (optioneel)", "");
          return (
            <li
              key={v.sleutel}
              className={`${kaartVlak} grid gap-4 sm:grid-cols-[160px_1fr]`}
            >
              <div className="flex flex-col items-center gap-1">
                {beeld ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={beeld.url} alt={`Meetfoto ${label}`} className="h-44 w-auto rounded-lg object-contain" />
                ) : (
                  <Lichaam meet={v.sleutel} titel={`Tekening ${label}`} className="h-44" />
                )}
                <span className="text-xs text-foreground/70">
                  {beeld ? "Eigen foto" : "Tekening wordt gebruikt"}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="font-semibold">{label}</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/70">{v.instructie}</p>
                <div className="flex flex-wrap items-start gap-3">
                  <FotoUpload sleutel={v.sleutel} heeftFoto={Boolean(beeld)} />
                  {beeld && (
                    <form action={verwijderFoto}>
                      <input type="hidden" name="sleutel" value={v.sleutel} />
                      <button className={knopSecundair}>
                        Foto verwijderen
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
