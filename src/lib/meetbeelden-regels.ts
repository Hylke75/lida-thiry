// Regels voor meetfoto's; los van meetbeelden.ts zodat ook de browser ze kan gebruiken.

/** Publieke Storage-bucket met door de adviseur geüploade meetfoto's. */
export const MEET_BUCKET = "meetinstructies";
export const MEET_MAX_BYTES = 5 * 1024 * 1024;
/** Toegestane bestandstypes met hun extensie. */
export const MEET_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
