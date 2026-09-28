#!/usr/bin/env bash
#
# Zet de geexporteerde Word-adviesdocumenten (.docx) om naar Markdown + afbeeldingen.
# Pipeline: pandoc -> GitHub-flavored Markdown, met beelden per type in een media-map.
#
# Gebruik:
#   scripts/docx-naar-markdown.sh [BRONMAP] [DOELMAP]
# Standaard:
#   BRONMAP = ~/Desktop/figuurtypes-advies
#   DOELMAP = ~/Desktop/figuurtypes-advies-md
#
# Vereist: pandoc (brew install pandoc). Geen Pages/Word nodig.

set -uo pipefail

BRON="${1:-$HOME/Desktop/figuurtypes-advies}"
UIT="${2:-$HOME/Desktop/figuurtypes-advies-md}"

mkdir -p "$UIT"
CSV="$UIT/index.csv"
echo "origineel,categorie,letter,sleutel,map" > "$CSV"

# Unieke doelmapnaam op basis van de sleutel (bij botsing -2, -3 ...).
kies_map() {
  local basis="$1" dir="$UIT/$1" i=2
  while [ -e "$dir" ]; do dir="$UIT/${basis}-$i"; i=$((i + 1)); done
  echo "$dir"
}

totaal=0; gedaan=0; mislukt=0
shopt -s nullglob
for src in "$BRON"/*.docx; do
  totaal=$((totaal + 1))
  base="$(basename "$src")"; base="${base%.docx}"

  categorie="$(printf '%s' "$base" | grep -oE '^[0-9]+' || true)"
  letter="$(printf '%s' "$base" | sed -E 's/^[0-9]+[* -]*//' | grep -oE '^[XAVH8]' || true)"
  sleutel="${categorie}${letter}"

  outdir="$(kies_map "$sleutel")"
  mkdir -p "$outdir"

  echo "== [$totaal] $base  ->  $(basename "$outdir")  (sleutel $sleutel)"
  if pandoc "$src" -f docx -t gfm --extract-media="$outdir/media" -o "$outdir/index.md" 2>>"$UIT/fouten.log"; then
    echo "\"$base\",$categorie,$letter,$sleutel,$(basename "$outdir")" >> "$CSV"
    gedaan=$((gedaan + 1))
  else
    echo "   !! pandoc mislukt (zie fouten.log)"; mislukt=$((mislukt + 1))
  fi
done

echo ""
echo "Klaar. Totaal $totaal · omgezet $gedaan · mislukt $mislukt"
echo "Output: $UIT"
echo "Index:  $CSV"
