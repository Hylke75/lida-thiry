// Maakt (of hergebruikt) een auth-gebruiker en registreert die als beheerder.
// De beheerder logt daarna in via de magic link op /admin/inloggen.
//
// Gebruik: node scripts/maak-beheerder.mjs <e-mailadres>
// Vereist SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local.

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPad = join(root, ".env.local");
if (existsSync(envPad)) {
  for (const l of readFileSync(envPad, "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2];
if (!url || !key) { console.error("Zet SUPABASE_SERVICE_ROLE_KEY en NEXT_PUBLIC_SUPABASE_URL in .env.local."); process.exit(1); }
if (!email) { console.error("Gebruik: node scripts/maak-beheerder.mjs <e-mailadres>"); process.exit(1); }

const supabase = createClient(url, key, { auth: { persistSession: false } });

// Bestaande gebruiker zoeken, anders aanmaken.
let gebruiker = null;
const { data: lijst } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
gebruiker = lijst?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null;
if (!gebruiker) {
  const { data, error } = await supabase.auth.admin.createUser({ email, email_confirm: true });
  if (error) { console.error("Gebruiker aanmaken mislukt:", error.message); process.exit(1); }
  gebruiker = data.user;
  console.log("Auth-gebruiker aangemaakt.");
} else {
  console.log("Bestaande auth-gebruiker hergebruikt.");
}

const { error: e2 } = await supabase
  .from("beheerders")
  .upsert({ gebruiker_id: gebruiker.id, email }, { onConflict: "gebruiker_id" });
if (e2) { console.error("Beheerder registreren mislukt:", e2.message); process.exit(1); }

console.log(`Beheerder geregistreerd: ${email}. Inloggen kan via /admin/inloggen (magic link).`);
