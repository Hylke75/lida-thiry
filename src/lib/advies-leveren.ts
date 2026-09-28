import "server-only";
import { adminClient } from "./supabase/admin";
import { genereerAdviesPdf, haalPdfBytes } from "./pdf/genereer";
import { stuurAdviesMail } from "./resend";
import { siteUrl } from "./site";

/**
 * Genereert de advies-PDF, mailt die naar de klant en zet de order op
 * 'advies_verzonden'. Vereist een toegekend type én een geïmporteerd
 * adviesdocument. Geeft true terug bij succes.
 */
export async function leverAdvies(orderId: string): Promise<boolean> {
  const supabase = adminClient();
  const { data: order } = await supabase
    .from("orders")
    .select("id, klantnaam, email, toegekend_type, testtoken")
    .eq("id", orderId)
    .single();
  if (!order?.toegekend_type) return false;

  const pad = await genereerAdviesPdf(orderId);
  if (!pad) return false;
  const pdf = await haalPdfBytes(pad);
  if (!pdf) return false;

  await stuurAdviesMail({
    naam: order.klantnaam,
    email: order.email,
    sleutel: order.toegekend_type,
    downloadUrl: `${siteUrl()}/api/test/${order.testtoken}/pdf`,
    pdf,
  });

  await supabase.from("orders").update({ status: "advies_verzonden" }).eq("id", orderId);
  return true;
}
