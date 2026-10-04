"use server";

import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { telTabellen } from "@/lib/backup/maken";

/** Aantal rijen per tabel nu in de database, om een back-up mee te vergelijken. */
export async function huidigeTellingen(): Promise<Record<string, number | null>> {
  await vereisBeheerder();
  return telTabellen(adminClient());
}
