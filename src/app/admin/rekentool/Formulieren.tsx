"use client";

import { useActionState } from "react";
import { invoerBreed, kaartVlak, knop, label, tekstUitleg, toon } from "@/components/admin/stijl";
import type { LidaGrenzen } from "@/rekenkern/config/lida-model";
import { proefBereken, slaRekenmodelOp, type ProefUitkomst, type Status } from "./acties";

function Uitkomst({ status }: { status: Status | null }) {
  if (!status) return null;
  return (
    <p role={status.ok ? "status" : "alert"} className={`rounded-lg px-4 py-3 text-sm ${status.ok ? toon.groen : toon.rood}`}>
      {status.melding}
    </p>
  );
}

/** De grenzen van Lida's methode, met uitleg, in procenten. */
const GRENS_VELDEN: { sleutel: keyof LidaGrenzen; label: string; uitleg: string }[] = [
  {
    sleutel: "zandloperTailleMax",
    label: "Zandloper: taille hooguit … % van borst of heup",
    uitleg: "Jouw regel: de taille is 25% kleiner dan de heup- of borstomtrek, dus 75%. Een kleiner getal maakt de Zandloper strenger.",
  },
  {
    sleutel: "heupBredMin",
    label: "Heupen voller: heup minstens … % groter dan de borst",
    uitleg: "Vanaf hier kijkt de berekening of het een Lepel of een Peer is. Daaronder zijn borst en heup ‘in balans’ (Zandloper of Rechthoek).",
  },
  {
    sleutel: "borstBredMin",
    label: "Borst voller: borst minstens … % groter dan de heup",
    uitleg: "Met duidelijke taille een Zandloper, zonder een Omgekeerde driehoek.",
  },
  {
    sleutel: "lepelHogeHeupMin",
    label: "Lepel: hoge heup minstens … % van de lage heup",
    uitleg: "Het ‘plankje’: de heup begint direct onder de taille, dus de hoge heup is bijna even breed als de lage heup.",
  },
  {
    sleutel: "peerHogeHeupMax",
    label: "Peer: hoge heup hooguit … % van de lage heup",
    uitleg: "De ronde overgang van taille naar heup. Valt het tussen Peer en Lepel in, dan beslist de handentest (kort = Lepel, lang = Peer); anders kiest de klant zelf of vraagt een stijladvies op afstand aan.",
  },
];

const alsProcent = (f: number) => String(Math.round(f * 1000) / 10).replace(".", ",");

/** Schakelaar FFIT / Lida en de grenzen van Lida's methode. */
export function RekenmodelFormulier({ model, grenzen }: { model: "ffit" | "lida"; grenzen: LidaGrenzen }) {
  const [status, actie, bezig] = useActionState<Status | null, FormData>(slaRekenmodelOp, null);
  return (
    <form action={actie} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-1 font-medium">Rekenmethode van de test</legend>
        <label className="flex items-start gap-2">
          <input type="radio" name="rekenmodel" value="ffit" defaultChecked={model === "ffit"} className="mt-1" />
          <span>
            <strong>FFIT-methode</strong> (zoals nu): alleen de omtrekken van borst, taille, hoge heup en heup, in vaste
            centimeters.
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="radio" name="rekenmodel" value="lida" defaultChecked={model === "lida"} className="mt-1" />
          <span>
            <strong>Jouw methode</strong>: omtrekken in procenten, plus de schouderbreedte, het breedste punt in de spiegel en
            de handentest. De test krijgt dan een extra stap &ldquo;Je proporties&rdquo;.
          </span>
        </label>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {GRENS_VELDEN.map((v) => (
          <label key={v.sleutel} className={label}>
            {v.label}
            <span className="flex items-center gap-2">
              <input
                name={v.sleutel}
                inputMode="decimal"
                defaultValue={alsProcent(grenzen[v.sleutel])}
                required
                className={`${invoerBreed} max-w-28`}
              />
              <span>%</span>
            </span>
            <span className={tekstUitleg}>{v.uitleg}</span>
          </label>
        ))}
      </div>

      <Uitkomst status={status} />
      <div>
        <button disabled={bezig} className={knop}>
          {bezig ? "Bezig…" : "Opslaan"}
        </button>
      </div>
    </form>
  );
}

const pct = (f: number) => `${Math.round(f * 100)}%`;

/** Proefberekening: rekent maten door met beide methodes, zonder iets op te slaan. */
export function Proefberekening() {
  const [uitkomst, actie, bezig] = useActionState<ProefUitkomst | Status | null, FormData>(proefBereken, null);
  const velden: [string, string, string][] = [
    ["lengte", "Lengte", "cm"],
    ["gewicht", "Gewicht", "kg"],
    ["borst", "Borst", "cm"],
    ["taille", "Taille", "cm"],
    ["hoge_heup", "Hoge heup", "cm"],
    ["heup", "Heup", "cm"],
  ];
  return (
    <form action={actie} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {velden.map(([naam, tekst, eenheid]) => (
          <label key={naam} className={label}>
            {tekst} ({eenheid})
            <input name={naam} inputMode="decimal" required className={invoerBreed} />
          </label>
        ))}
        <label className={label}>
          Breedste punt in de spiegel
          <select name="breedste_punt" defaultValue="gelijk" className={invoerBreed}>
            <option value="schouders">Schouders</option>
            <option value="gelijk">Ongeveer gelijk</option>
            <option value="heupen">Heupen</option>
          </select>
        </label>
        <label className={label}>
          Bovenlichaam (handentest)
          <select name="bovenlichaam" defaultValue="gemiddeld" className={invoerBreed}>
            <option value="kort">Kort</option>
            <option value="gemiddeld">Gemiddeld</option>
            <option value="lang">Lang</option>
          </select>
        </label>
      </div>
      <div>
        <button disabled={bezig} className={knop}>
          {bezig ? "Bezig…" : "Bereken"}
        </button>
      </div>

      {uitkomst && "categorie" in uitkomst ? (
        <div className="grid gap-3 sm:grid-cols-2" role="status">
          <div className={kaartVlak}>
            <p className="text-xs text-foreground/70">FFIT-methode</p>
            <p className="font-serif text-xl">
              {uitkomst.ffit.letter ? `${uitkomst.categorie.nummer}${uitkomst.ffit.letter} · ${uitkomst.ffit.naam}` : "Geen type"}
            </p>
            <p className="text-sm text-foreground/70">Uitkomst FFIT: {uitkomst.ffit.type}</p>
          </div>
          <div className={kaartVlak}>
            <p className="text-xs text-foreground/70">Jouw methode</p>
            <p className="font-serif text-xl">
              {uitkomst.lida.letter
                ? `${uitkomst.categorie.nummer}${uitkomst.lida.letter} · ${uitkomst.lida.naam}`
                : "Geen duidelijk silhouet"}
            </p>
            <p className="text-sm">{uitkomst.lida.uitleg}</p>
            <p className="mt-1 text-xs text-foreground/70">
              Heup t.o.v. borst {pct(uitkomst.lida.kengetallen.heupVoorsprong)} · taille {pct(uitkomst.lida.kengetallen.tailleRatio)}{" "}
              van de grootste omtrek · hoge heup {pct(uitkomst.lida.kengetallen.hogeHeupRatio)} van de lage heup
            </p>
          </div>
          <p className="text-sm text-foreground/70 sm:col-span-2">
            Categorie {uitkomst.categorie.nummer}: {uitkomst.categorie.titel}. Er is niets opgeslagen.
          </p>
        </div>
      ) : (
        <Uitkomst status={uitkomst as Status | null} />
      )}
    </form>
  );
}
