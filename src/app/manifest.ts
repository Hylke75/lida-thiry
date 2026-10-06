import type { MetadataRoute } from "next";

/**
 * Web-app-manifest voor het beheer: op de telefoon "Zet op beginscherm" maakt er
 * een app van die direct in /admin opent (nodig voor pushmeldingen op iOS).
 * Kleuren uit de huisstijl (globals.css); iconen in public/ zijn gemaakt uit app/icon.svg.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/admin",
    name: "Beheer · Lida Thiry",
    short_name: "Beheer LT",
    description: "Beheeromgeving van Lida Thiry Imago & Kledingadvies: bestellingen, berichten en meldingen.",
    lang: "nl",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#FFF9F3",
    theme_color: "#6F2D59",
    icons: [
      { src: "/beheer-icoon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/beheer-icoon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/beheer-icoon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
