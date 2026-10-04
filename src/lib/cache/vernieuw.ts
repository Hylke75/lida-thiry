import "server-only";
import { revalidateTag } from "next/cache";
import { tagsVoorTabellen, type CacheTabel } from "./tags";

/**
 * Na een wijziging in het beheer: laat de publieke cache van deze tabellen
 * meteen verlopen (zie lib/cache/tags.ts voor de koppeling tabel → tag).
 * `expire: 0`: de volgende bezoeker krijgt direct de nieuwe gegevens (geen
 * oude versie meer terwijl op de achtergrond wordt ververst), zodat Lida haar
 * wijziging meteen op de site ziet. Werkt in Server Actions én Route Handlers.
 * Bestaande revalidatePath-aanroepen blijven staan (die vernieuwen de pagina's).
 */
export function vernieuwPubliekeData(...tabellen: CacheTabel[]): void {
  for (const tag of tagsVoorTabellen(tabellen)) {
    try {
      revalidateTag(tag, { expire: 0 });
    } catch (e) {
      // Buiten een Next-request (tests, scripts) is er geen cache om te legen.
      console.error(`Cache-tag ${tag} niet vernieuwd`, e instanceof Error ? e.message : e);
    }
  }
}
