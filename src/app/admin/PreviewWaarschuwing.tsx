import { databaseStatus, HANDLEIDING_TESTOMGEVING, huidigeDatabaseOmgeving } from "@/lib/omgeving";

/**
 * Rode balk in het beheer als een Vercel-preview de productiedatabase gebruikt:
 * alles wat je hier doet (bestellingen, mails, wijzigingen) raakt dan de echte site.
 */
export function PreviewWaarschuwing() {
  if (databaseStatus(huidigeDatabaseOmgeving()) !== "preview-op-productie") return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-300 bg-red-600 px-4 py-3 text-sm font-medium text-white dark:border-red-800 dark:bg-red-800"
    >
      Let op: deze preview gebruikt de productiedatabase. Wijzigingen, bestellingen en mails hier zijn echt.{" "}
      <a href={HANDLEIDING_TESTOMGEVING} className="underline underline-offset-4" target="_blank" rel="noreferrer">
        Aparte testdatabase instellen
      </a>
    </p>
  );
}
