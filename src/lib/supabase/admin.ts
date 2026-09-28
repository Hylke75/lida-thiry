import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase-client met de service-role-sleutel. ALLEEN server-side gebruiken
 * (Route Handlers / Server Actions). Omzeilt RLS; nooit naar de client sturen.
 */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY en NEXT_PUBLIC_SUPABASE_URL zijn vereist (server).",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
