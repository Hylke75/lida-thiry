import { vereisBeheerder } from "@/lib/admin-auth";
import { leesMeetBeeldRijen } from "@/lib/meetbeelden";
import { MAAT_VELDEN } from "@/lib/test-config";
import { Lichaam } from "@/app/test/[token]/Lichaam";
import { AdminNav, Melding } from "../AdminNav";
import { FotoUpload } from "./FotoUpload";
import { verwijderFoto } from "./acties";

export const dynamic = "force-dynamic";

export default async function MeetinstructiesPagina({
  searchParams,
}: {
  searchParams: Promise<{ verwijderd?: string }>;
}) {
  await vereisBeheerder();
  const { verwijderd } = await searchParams;
  const beelden = await leesMeetBeeldRijen();
  const verwijderdLabel = MAAT_VELDEN.find((v) => v.sleutel === verwijderd)?.label;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <AdminNav actief="/admin/meetinstructies" />
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Meetinstructies</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Bij elke maat ziet de klant in de test een tekening van hoe ze moet meten. Upload hier een eigen foto
          om die tekening te vervangen. Een JPG-, PNG- of WebP-foto van maximaal 5 MB. Verwijder je de foto,
          dan wordt de tekening weer gebruikt.
        </p>
      </div>

      {verwijderdLabel && <Melding soort="ok">De foto bij &lsquo;{verwijderdLabel}&rsquo; is verwijderd.</Melding>}

      <ul className="flex flex-col gap-4">
        {MAAT_VELDEN.map((v) => {
          const beeld = beelden[v.sleutel];
          const label = v.label.replace(" (optioneel)", "");
          return (
            <li
              key={v.sleutel}
              className="grid gap-4 rounded-2xl border border-black/10 bg-kaart p-4 dark:border-white/15 sm:grid-cols-[160px_1fr]"
            >
              <div className="flex flex-col items-center gap-1">
                {beeld ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={beeld.url} alt={`Meetfoto ${label}`} className="h-44 w-auto rounded-lg object-contain" />
                ) : (
                  <Lichaam meet={v.sleutel} titel={`Tekening ${label}`} className="h-44" />
                )}
                <span className="text-xs text-black/50 dark:text-white/50">
                  {beeld ? "Eigen foto" : "Tekening wordt gebruikt"}
                </span>
              </div>
              <div className="flex flex-col gap-3">
                <h2 className="font-semibold">{label}</h2>
                <p className="text-sm leading-relaxed text-black/60 dark:text-white/60">{v.instructie}</p>
                <div className="flex flex-wrap items-start gap-3">
                  <FotoUpload sleutel={v.sleutel} heeftFoto={Boolean(beeld)} />
                  {beeld && (
                    <form action={verwijderFoto}>
                      <input type="hidden" name="sleutel" value={v.sleutel} />
                      <button className="rounded-full border border-black/15 px-5 py-2 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/5">
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
