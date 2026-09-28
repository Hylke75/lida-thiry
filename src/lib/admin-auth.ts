import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

/**
 * Vereist een ingelogde beheerder. Redirect naar de inlogpagina wanneer er geen
 * sessie is of de gebruiker geen beheerder is. Retourneert de gebruiker.
 */
export async function vereisBeheerder() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/inloggen");

  const { data: beheerder } = await supabase
    .from("beheerders")
    .select("gebruiker_id")
    .eq("gebruiker_id", user.id)
    .maybeSingle();
  if (!beheerder) redirect("/admin/inloggen?geen_toegang=1");

  return user;
}
