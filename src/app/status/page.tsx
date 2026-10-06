import { permanentRedirect } from "next/navigation";

// De verbindingsstatus staat in het beheer (Beheer → Fouten → Verbindingsstatus);
// dit oude adres stuurt daarheen (en het beheer vraagt om in te loggen).
export default function OudeStatusPagina(): never {
  permanentRedirect("/admin/status");
}
