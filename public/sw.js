/*
 * Service worker voor het beheer (scope /admin), geregistreerd door
 * src/app/admin/PwaRegistratie.tsx.
 *
 * - Pushmeldingen tonen en bij een klik de juiste beheerpagina openen.
 * - GEEN caching van pagina's: elke navigatie gaat gewoon naar het netwerk.
 *   Alleen als dat mislukt (offline) tonen we een eenvoudige offlinepagina.
 */

const VERSIE = "beheer-v1";
const OFFLINE = "/admin-offline.html";
const ICOON = "/beheer-icoon-192.png";
const BADGE = "/beheer-badge-96.png";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSIE)
      .then((cache) => cache.addAll([OFFLINE, ICOON, BADGE]))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((sleutels) => Promise.all(sleutels.filter((s) => s !== VERSIE).map((s) => caches.delete(s))))
      .then(() => self.clients.claim()),
  );
});

// Alleen navigaties: netwerk eerst (niets bewaren), offlinepagina als terugval.
self.addEventListener("fetch", (event) => {
  const verzoek = event.request;
  if (verzoek.mode !== "navigate" || verzoek.method !== "GET") return;
  event.respondWith(
    fetch(verzoek).catch(() =>
      caches.match(OFFLINE).then((antwoord) => antwoord || new Response("Offline", { status: 503 })),
    ),
  );
});

/** Alleen een pad binnen deze site; anders het beheer. */
function veiligPad(url) {
  try {
    const u = new URL(url || "/admin", self.location.origin);
    return u.origin === self.location.origin ? u.pathname + u.search + u.hash : "/admin";
  } catch {
    return "/admin";
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { tekst: event.data ? event.data.text() : "" };
  }
  const titel = typeof data.titel === "string" && data.titel ? data.titel : "Beheer · Lida Thiry";
  // Er moet altijd een melding verschijnen (userVisibleOnly), ook zonder inhoud.
  event.waitUntil(
    self.registration.showNotification(titel, {
      body: typeof data.tekst === "string" ? data.tekst : "",
      icon: ICOON,
      badge: BADGE,
      tag: typeof data.tag === "string" && data.tag ? data.tag : undefined,
      renotify: Boolean(data.tag),
      timestamp: typeof data.tijd === "number" ? data.tijd : Date.now(),
      lang: "nl",
      data: { url: veiligPad(data.url) },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const pad = veiligPad(event.notification.data && event.notification.data.url);
  const doel = new URL(pad, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (vensters) => {
      // Een open beheervenster hergebruiken; anders een nieuw venster.
      const venster = vensters.find((v) => new URL(v.url).pathname.startsWith("/admin"));
      if (venster) {
        try {
          const genavigeerd = "navigate" in venster ? await venster.navigate(doel) : null;
          return (genavigeerd || venster).focus();
        } catch {
          // navigate() kan falen bij een venster buiten de scope; dan een nieuw venster.
        }
      }
      return self.clients.openWindow(doel);
    }),
  );
});

// De browser heeft het abonnement vernieuwd: het nieuwe adres doorgeven aan de server.
self.addEventListener("pushsubscriptionchange", (event) => {
  const oud = event.oldSubscription;
  event.waitUntil(
    (event.newSubscription
      ? Promise.resolve(event.newSubscription)
      : oud && oud.options && oud.options.applicationServerKey
        ? self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: oud.options.applicationServerKey,
          })
        : Promise.resolve(null)
    )
      .then((nieuw) => {
        if (!nieuw || !oud) return undefined;
        return fetch("/api/push/vernieuw", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oudEndpoint: oud.endpoint, abonnement: nieuw.toJSON() }),
        });
      })
      .catch(() => undefined),
  );
});
