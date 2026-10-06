import type { NextConfig } from "next";
import { opslagPatroon } from "./src/lib/media/afbeelding";

// Beeldoptimalisatie (next/image): alleen openbare bestanden uit de opslag van
// ons eigen Supabase-project (afgeleid van NEXT_PUBLIC_SUPABASE_URL tijdens de
// build) en eigen paden. Andere adressen tonen we als gewone <img> (zie
// src/components/Afbeelding.tsx), zodat de optimalisatie niet te misbruiken is.
const opslag = opslagPatroon(process.env.NEXT_PUBLIC_SUPABASE_URL);

// Lettertypen van de huisstijl (src/lib/pdf/fonts, SIL OFL). Ze worden met
// fs gelezen vanaf process.cwd() (src/lib/pdf/huisstijl.tsx, app/opengraph-image.tsx),
// dus de bestandstracering ziet ze niet vanzelf: meegeven aan elke functie die
// een PDF of de deelafbeelding maakt. PDF's ontstaan in API-routes (testlink,
// Mollie-webhook, onderhoud) en in serveracties en routes van het beheer.
const LETTERTYPEN = ["./src/lib/pdf/fonts/**/*"];

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/**": LETTERTYPEN,
    "/admin/**": LETTERTYPEN,
    "/opengraph-image": LETTERTYPEN,
  },
  images: {
    remotePatterns: opslag ? [opslag] : [],
    // WebP: goed ondersteund en snel te maken. (AVIF is kleiner maar kost veel
    // meer rekentijd per beeld; voor deze site niet de moeite.)
    formats: ["image/webp"],
    // Breedtes voor schermvullende beelden (telefoon → groot scherm) en voor
    // kleinere beelden met `sizes` (kaarten, logo, miniaturen).
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [96, 128, 160, 256, 320, 384],
    qualities: [75],
    // Geüploade bestanden krijgen een uniek adres (uuid) en veranderen niet: lang bewaren.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
