// Maakt een nieuw VAPID-sleutelpaar voor pushmeldingen (Beheer → Meldingen).
//
// Gebruik: node scripts/vapid-sleutels.mjs [mailto:jij@voorbeeld.nl]
// Zet de uitvoer in .env.local en in Vercel (Settings → Environment Variables).
// Let op: met een nieuw sleutelpaar werken bestaande aanmeldingen niet meer;
// zet push daarna op elk apparaat opnieuw aan.

import webpush from "web-push";

const onderwerp = process.argv[2] ?? "mailto:info@voorbeeld.nl";
const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log(`VAPID_SUBJECT=${onderwerp.startsWith("mailto:") || onderwerp.startsWith("https://") ? onderwerp : `mailto:${onderwerp}`}`);
