#!/usr/bin/env bash
#
# Zet de aangeleverde Apple Pages-adviesdocumenten om naar Markdown + afbeeldingen.
# Pipeline: Pages (via AppleScript) -> Word (.docx) -> pandoc -> GitHub-flavored Markdown.
#
# Gebruik:
#   scripts/pages-naar-markdown.sh [BRONMAP] [DOELMAP]
# Standaard:
#   BRONMAP = ~/Desktop/figuurtypes-advies
#   DOELMAP = ~/Desktop/figuurtypes-advies-md
#
# Vereist: macOS met Pages geïnstalleerd + pandoc (brew install pandoc).
# Hervatbaar: reeds omgezette documenten (marker in DOELMAP/.gedaan) worden overgeslagen.

set -uo pipefail

BRON="${1:-$HOME/Desktop/figuurtypes-advies}"
UIT="${2:-$HOME/Desktop/figuurtypes-advies-md}"
HIER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APPLESCRIPT="$HIER/pages-export.applescript"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$UIT" "$UIT/.gedaan"
CSV="$UIT/index.csv"
[ -f "$CSV" ] || echo "origineel,categorie,letter,sleutel,map" > "$CSV"

# Maakt van een sleutel een unieke doelmapnaam (met -2, -3 ... bij botsing).
kies_map() {
  local basis="$1" dir="$UIT/$1" i=2
  while [ -e "$dir" ]; do dir="$UIT/${basis}-$i"; i=$((i + 1)); done
  echo "$dir"
}

totaal=0; gedaan=0; overgeslagen=0; mislukt=0

for src in "$BRON"/*.pages; do
  [ -e "$src" ] || continue
  totaal=$((totaal + 1))
  base="$(basename "$src")"; base="${base%.pages}"

  # Marker per UNIEK origineel (bestandsnamen zijn uniek, ook met * en spaties).
  marker="$UIT/.gedaan/$base"
  if [ -f "$marker" ]; then
    echo "== overslaan (al klaar): $base"
    overgeslagen=$((overgeslagen + 1)); continue
  fi

  # Categorie (1e getal) en letter (X/A/V/H/8) afleiden uit de naam.
  categorie="$(printf '%s' "$base" | grep -oE '^[0-9]+' || true)"
  letter="$(printf '%s' "$base" | sed -E 's/^[0-9]+[* ]*[- ]*//' | grep -oE '^[A-Z8]' || true)"
  sleutel="${categorie}${letter}"

  outdir="$(kies_map "$sleutel")"
  mkdir -p "$outdir"
  docx="$TMP/$sleutel.docx"; rm -f "$docx"

  echo "== omzetten [$totaal]: $base  ->  $(basename "$outdir")  (sleutel $sleutel)"
  if ! osascript "$APPLESCRIPT" "$src" "$docx" >/dev/null 2>>"$UIT/fouten.log"; then
    echo "   !! Pages-export mislukt (zie fouten.log)"; mislukt=$((mislukt + 1)); rmdir "$outdir" 2>/dev/null; continue
  fi
  if ! pandoc "$docx" -f docx -t gfm --extract-media="$outdir/media" -o "$outdir/index.md" 2>>"$UIT/fouten.log"; then
    echo "   !! pandoc-conversie mislukt (zie fouten.log)"; mislukt=$((mislukt + 1)); rm -f "$docx"; continue
  fi

  rm -f "$docx"
  touch "$marker"
  echo "\"$base\",$categorie,$letter,$sleutel,$(basename "$outdir")" >> "$CSV"
  gedaan=$((gedaan + 1))
done

echo ""
echo "Klaar. Totaal $totaal · omgezet $gedaan · overgeslagen $overgeslagen · mislukt $mislukt"
echo "Output: $UIT"
echo "Index:  $CSV"
