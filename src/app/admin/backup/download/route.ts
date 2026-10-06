import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { backupBestandsnaam } from "@/lib/backup/formaat";
import { backupStream } from "@/lib/backup/maken";
import { registreerFout } from "@/lib/fouten/registreer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Volledige back-up van de database als gzip-JSON (Beheer → Instellingen →
 * Back-up). Wordt gestreamd, tabel voor tabel. Bevat persoonsgegevens: alleen
 * voor beheerders, nooit gecachet.
 */
export async function GET() {
  const gebruiker = await vereisBeheerder("backup");
  const supabase = adminClient();
  const nu = new Date();

  // Wie wanneer een back-up maakte (mag mislukken).
  await supabase
    .from("beheer_log")
    .insert({
      gebruiker_id: gebruiker.id,
      email: gebruiker.email ?? null,
      actie: "backup.downloaden",
      onderwerp_soort: "backup",
      omschrijving: "Volledige back-up gedownload",
    })
    .then(
      () => undefined,
      () => undefined,
    );

  const stream = backupStream(supabase, (e) => {
    void registreerFout({ bron: "server", fout: e, pad: "/admin/backup/download", details: { onderdeel: "back-up maken" } });
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="${backupBestandsnaam(nu)}"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
