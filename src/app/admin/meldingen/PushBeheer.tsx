"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  base64UrlNaarBytes,
  PUSH_SOORT_LABEL,
  PUSH_SOORTEN,
  STANDAARD_SOORTEN,
  type PushSoort,
} from "@/lib/push/regels";
import { Melding } from "../Melding";
import { bewaarSoorten, meldApparaatAan, meldApparaatAf, stuurTest, verwijderApparaat, type ActieUitkomst } from "./acties";

export interface Apparaat {
  id: string;
  endpoint: string;
  apparaat: string | null;
  meldingen: string[];
  aangemaakt_op: string;
  laatst_gebruikt_op: string | null;
}

type Toestand = "laden" | "niet-ondersteund" | "ios-installeren" | "geweigerd" | "uit" | "aan";

const knop =
  "rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50";
const tweedeKnop =
  "rounded-full border border-black/15 px-4 py-2 text-sm hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/5";
const kaart = "flex flex-col gap-3 rounded-2xl border border-black/10 bg-kaart p-4 sm:p-5 dark:border-white/15";

function isIos(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

function isGeinstalleerd(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function zelfdeSleutel(a: ArrayBuffer | null, b: Uint8Array): boolean {
  if (!a) return true;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

async function registratie(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/admin", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

/** Wat dit apparaat kan en of het al is aangemeld (zonder state; zie het effect). */
async function leesToestand(): Promise<{ toestand: Toestand; endpoint: string | null; iosHint: boolean }> {
  const iosHint = isIos() && !isGeinstalleerd();
  const ondersteund = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!ondersteund) return { toestand: iosHint ? "ios-installeren" : "niet-ondersteund", endpoint: null, iosHint };
  try {
    const reg = await registratie();
    const sub = await reg.pushManager.getSubscription();
    const toestand: Toestand = Notification.permission === "denied" ? "geweigerd" : sub ? "aan" : "uit";
    return { toestand, endpoint: sub?.endpoint ?? null, iosHint };
  } catch {
    return { toestand: "niet-ondersteund", endpoint: null, iosHint };
  }
}

function datum(iso: string | null): string {
  if (!iso) return "nog niet";
  return new Date(iso).toLocaleString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Push aan/uit op dit apparaat, keuze van meldingen, testmelding en de lijst eigen apparaten. */
export function PushBeheer({ publiekeSleutel, apparaten }: { publiekeSleutel: string | null; apparaten: Apparaat[] }) {
  const router = useRouter();
  const [toestand, setToestand] = useState<Toestand>("laden");
  const [endpoint, setEndpoint] = useState<string | null>(null);
  /** Keuze die je op deze pagina hebt gemaakt; anders de opgeslagen keuze van dit apparaat. */
  const [keuze, setKeuze] = useState<PushSoort[] | null>(null);
  const [uitkomst, setUitkomst] = useState<ActieUitkomst | null>(null);
  const [bezig, startBezig] = useTransition();
  const [iosHint, setIosHint] = useState(false);

  const ditApparaat = endpoint ? apparaten.find((a) => a.endpoint === endpoint) : undefined;
  const soorten: PushSoort[] =
    keuze ?? (ditApparaat ? PUSH_SOORTEN.filter((s) => ditApparaat.meldingen.includes(s)) : [...STANDAARD_SOORTEN]);

  useEffect(() => {
    let actief = true;
    leesToestand().then((t) => {
      if (!actief) return;
      setIosHint(t.iosHint);
      setEndpoint(t.endpoint);
      setToestand(t.toestand);
    });
    return () => {
      actief = false;
    };
  }, []);

  function klaar(u: ActieUitkomst) {
    setUitkomst(u);
    router.refresh();
  }

  function aanzetten() {
    if (!publiekeSleutel) return;
    startBezig(async () => {
      try {
        const toestemming = await Notification.requestPermission();
        if (toestemming !== "granted") {
          setToestand(toestemming === "denied" ? "geweigerd" : "uit");
          setUitkomst({ ok: false, bericht: "Zonder toestemming voor meldingen kan push niet aan." });
          return;
        }
        const reg = await registratie();
        const sleutel = base64UrlNaarBytes(publiekeSleutel);
        let sub = await reg.pushManager.getSubscription();
        if (sub && !zelfdeSleutel(sub.options.applicationServerKey, sleutel)) {
          // Oud abonnement met een andere VAPID-sleutel: werkt niet meer, opnieuw aanmelden.
          await sub.unsubscribe().catch(() => undefined);
          sub = null;
        }
        if (!sub) {
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: sleutel });
        }
        const u = await meldApparaatAan(sub.toJSON(), soorten);
        setEndpoint(sub.endpoint);
        setToestand(u.ok ? "aan" : "uit");
        klaar(u);
      } catch (e) {
        setUitkomst({ ok: false, bericht: `Aanzetten is niet gelukt${e instanceof Error ? `: ${e.message}` : "."}` });
      }
    });
  }

  function uitzetten() {
    startBezig(async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration("/admin");
        const sub = await reg?.pushManager.getSubscription();
        const adres = sub?.endpoint ?? endpoint;
        await sub?.unsubscribe().catch(() => undefined);
        setEndpoint(null);
        setToestand("uit");
        klaar(adres ? await meldApparaatAf(adres) : { ok: true, bericht: "Pushmeldingen staan uit op dit apparaat." });
      } catch (e) {
        setUitkomst({ ok: false, bericht: `Uitzetten is niet gelukt${e instanceof Error ? `: ${e.message}` : "."}` });
      }
    });
  }

  function wisselSoort(s: PushSoort, aan: boolean) {
    const nieuw = PUSH_SOORTEN.filter((x) => (x === s ? aan : soorten.includes(x)));
    setKeuze(nieuw);
    if (toestand === "aan" && endpoint && ditApparaat) {
      startBezig(async () => klaar(await bewaarSoorten(endpoint, nieuw)));
    }
  }

  function test() {
    startBezig(async () => klaar(await stuurTest()));
  }

  function verwijder(id: string) {
    startBezig(async () => {
      const u = await verwijderApparaat(id);
      if (u.ok && ditApparaat?.id === id) {
        const reg = await navigator.serviceWorker.getRegistration("/admin");
        await (await reg?.pushManager.getSubscription())?.unsubscribe().catch(() => undefined);
        setEndpoint(null);
        setToestand("uit");
      }
      klaar(u);
    });
  }

  const aanMaarNietOpgeslagen = toestand === "aan" && !ditApparaat;

  return (
    <div className="flex flex-col gap-6">
      {uitkomst && <Melding soort={uitkomst.ok ? "ok" : "fout"}>{uitkomst.bericht}</Melding>}

      <section className={kaart} aria-labelledby="dit-apparaat">
        <h2 id="dit-apparaat" className="text-lg">
          Dit apparaat
        </h2>

        {!publiekeSleutel ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            Pushmeldingen zijn nog niet ingesteld op de server. Zet VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY en VAPID_SUBJECT
            in Vercel (maak een sleutelpaar met <code>node scripts/vapid-sleutels.mjs</code>) en publiceer opnieuw.
          </p>
        ) : toestand === "laden" ? (
          <p className="text-sm text-black/60 dark:text-white/60">Even kijken wat dit apparaat kan…</p>
        ) : toestand === "ios-installeren" ? (
          <div className="flex flex-col gap-2 text-sm text-black/70 dark:text-white/70">
            <p>
              Op een iPhone of iPad werken pushmeldingen alleen vanuit de app op je beginscherm (iOS 16.4 of nieuwer).
            </p>
            <ol className="ml-5 list-decimal">
              <li>Open deze pagina in Safari.</li>
              <li>Tik op de deelknop (vierkant met pijl omhoog) en kies ‘Zet op beginscherm’.</li>
              <li>Open ‘Beheer LT’ vanaf je beginscherm, log in en kom terug op Meldingen.</li>
            </ol>
          </div>
        ) : toestand === "niet-ondersteund" ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            Deze browser ondersteunt geen pushmeldingen. Probeer Chrome, Edge, Firefox of Safari (op iPhone: eerst op het
            beginscherm zetten).
          </p>
        ) : toestand === "geweigerd" ? (
          <p className="text-sm text-black/60 dark:text-white/60">
            Meldingen zijn voor deze site geblokkeerd. Sta ze toe in de instellingen van je browser (bij het slotje naast
            het adres) en laad de pagina opnieuw.
          </p>
        ) : (
          <>
            <p className="text-sm text-black/70 dark:text-white/70">
              {toestand === "aan" && !aanMaarNietOpgeslagen
                ? "Pushmeldingen staan aan op dit apparaat."
                : aanMaarNietOpgeslagen
                  ? "Dit apparaat is niet (meer) aangemeld bij de server. Zet push opnieuw aan."
                  : "Pushmeldingen staan uit op dit apparaat."}
            </p>
            <div className="flex flex-wrap gap-2">
              {toestand === "aan" && !aanMaarNietOpgeslagen ? (
                <>
                  <button type="button" onClick={test} disabled={bezig} className={knop}>
                    Testmelding sturen
                  </button>
                  <button type="button" onClick={uitzetten} disabled={bezig} className={tweedeKnop}>
                    Uitzetten
                  </button>
                </>
              ) : (
                <button type="button" onClick={aanzetten} disabled={bezig} className={knop}>
                  Pushmeldingen aanzetten
                </button>
              )}
            </div>
            {iosHint && (
              <p className="text-xs text-black/50 dark:text-white/50">
                Op iPhone/iPad: zet het beheer eerst op je beginscherm (deelknop → ‘Zet op beginscherm’).
              </p>
            )}
          </>
        )}
      </section>

      <section className={kaart} aria-labelledby="welke-meldingen">
        <h2 id="welke-meldingen" className="text-lg">
          Welke meldingen
        </h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          Geldt voor dit apparaat{toestand === "aan" && ditApparaat ? " en wordt direct opgeslagen" : "; wordt opgeslagen bij het aanzetten"}.
        </p>
        <fieldset className="flex flex-col gap-2" disabled={bezig}>
          <legend className="sr-only">Soorten meldingen</legend>
          {PUSH_SOORTEN.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={soorten.includes(s)}
                onChange={(e) => wisselSoort(s, e.currentTarget.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              {PUSH_SOORT_LABEL[s]}
            </label>
          ))}
        </fieldset>
      </section>

      <section className={kaart} aria-labelledby="mijn-apparaten">
        <h2 id="mijn-apparaten" className="text-lg">
          Mijn apparaten
        </h2>
        {apparaten.length === 0 ? (
          <p className="text-sm text-black/60 dark:text-white/60">Nog geen apparaten aangemeld.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-black/5 dark:divide-white/10">
            {apparaten.map((a) => (
              <li key={a.id} className="flex flex-wrap items-start justify-between gap-3 py-2.5 text-sm">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-medium">
                    {a.apparaat || "Onbekend apparaat"}
                    {a.endpoint === endpoint && (
                      <span className="ml-2 rounded-full bg-accent-zacht px-2 py-0.5 text-xs font-normal text-accent">
                        dit apparaat
                      </span>
                    )}
                  </span>
                  <span className="text-black/60 dark:text-white/60">
                    {a.meldingen.length
                      ? a.meldingen.map((m) => PUSH_SOORT_LABEL[m as PushSoort] ?? m).join(", ")
                      : "Geen meldingen gekozen"}
                  </span>
                  <span className="text-xs text-black/50 dark:text-white/50">
                    Aangemeld {datum(a.aangemaakt_op)} · laatste melding {datum(a.laatst_gebruikt_op)}
                  </span>
                </span>
                <button type="button" onClick={() => verwijder(a.id)} disabled={bezig} className={tweedeKnop}>
                  Verwijderen
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
