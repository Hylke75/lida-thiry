#!/usr/bin/env python3
"""Parseert de geconverteerde advies-Markdown naar SQL voor adviestypes + adviessecties.

Knipt elk document op in de vaste secties (kopjes uit de prompt), haalt de
afbeeldingsbestandsnamen per sectie eruit, en schrijft idempotente INSERTs.
"""
import os
import re
import sys

BASIS = os.path.expanduser("~/Desktop/figuurtypes-advies-md")

# Vaste sectie-opbouw (genormaliseerd: kleine letters, zonder dubbele punt).
SECTIES = [
    "je hebt", "je kledingplan", "je schouders", "je bovenlichaam",
    "je taille en middenrif", "je onderlichaam", "je kleuren en dessins",
    "je sieraden", "je sjaals", "je riemen en ceintuurs", "je schoenen",
    "je tassen", "je broeken", "je rokken", "je tops", "je jasjes en mantels",
    "je jurken", "tips", "voorbeeldoutfits", "je voorbeeldoutfits",
]

# 3 voorbeeldtypes met bekende figuurnaam (letters X/A/V).
TYPES = [
    {"sleutel": "2X", "map": "2X", "letter": "X", "categorie": 2,
     "titel": "2X · De zandloper · korte lengte, gemiddelde maat",
     "lengte_label": "kort", "maat_label": "gemiddeld"},
    {"sleutel": "6A", "map": "6A", "letter": "A", "categorie": 6,
     "titel": "6A · De peer (driehoek) · gemiddelde lengte en maat",
     "lengte_label": "gemiddeld", "maat_label": "gemiddeld"},
    {"sleutel": "8V", "map": "8V", "letter": "V", "categorie": 8,
     "titel": "8V · De omgekeerde driehoek · gemiddelde lengte, plus maat",
     "lengte_label": "gemiddeld", "maat_label": "plus"},
]


def sql_str(s):
    if s is None:
        return "null"
    return "'" + s.replace("'", "''") + "'"


def normaliseer_kop(regel):
    # '**Je hebt:**' -> 'je hebt'
    m = re.match(r"^\*\*(.+?)\*\*:?\s*$", regel.strip())
    if not m:
        return None
    return m.group(1).strip().rstrip(":").strip().lower()


def haal_afbeeldingen(tekst):
    namen = []
    for m in re.finditer(r'src="([^"]+)"', tekst):
        namen.append(os.path.basename(m.group(1)))
    for m in re.finditer(r"!\[[^\]]*\]\(([^)]+)\)", tekst):
        namen.append(os.path.basename(m.group(1)))
    # uniek, volgorde behouden
    gezien = set()
    uniek = []
    for n in namen:
        if n not in gezien:
            gezien.add(n)
            uniek.append(n)
    return uniek


def strip_figuren(tekst):
    tekst = re.sub(r"<figure>.*?</figure>", "", tekst, flags=re.DOTALL)
    tekst = re.sub(r"<img[^>]*/?>", "", tekst)
    tekst = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", tekst)
    return re.sub(r"\n{3,}", "\n\n", tekst).strip()


def parse(md_pad):
    with open(md_pad, encoding="utf-8") as f:
        regels = f.read().splitlines()

    secties = []
    huidige = None
    for regel in regels:
        kop = normaliseer_kop(regel)
        if kop is not None and kop in SECTIES:
            huidige = {"kop": re.match(r"^\*\*(.+?)\*\*:?\s*$", regel.strip()).group(1).strip().rstrip(":"),
                       "regels": []}
            secties.append(huidige)
        elif huidige is not None:
            huidige["regels"].append(regel)

    resultaat = []
    for s in secties:
        ruwe = "\n".join(s["regels"])
        afb = haal_afbeeldingen(ruwe)
        tekst = strip_figuren(ruwe)
        resultaat.append({"kop": s["kop"], "tekst": tekst, "afbeeldingen": afb})
    return resultaat


def main():
    uit = []
    for t in TYPES:
        md = os.path.join(BASIS, t["map"], "index.md")
        secties = parse(md)
        uit.append(
            "insert into public.adviestypes (sleutel, letter, categorie, titel, lengte_label, maat_label) values "
            f"({sql_str(t['sleutel'])}, {sql_str(t['letter'])}, {t['categorie']}, "
            f"{sql_str(t['titel'])}, {sql_str(t['lengte_label'])}, {sql_str(t['maat_label'])}) "
            "on conflict (sleutel) do nothing;"
        )
        uit.append(f"delete from public.adviessecties where type_sleutel = {sql_str(t['sleutel'])};")
        for i, s in enumerate(secties, start=1):
            afb_json = "[" + ", ".join(sql_str(a) for a in s["afbeeldingen"]) + "]"
            afb_json = "jsonb_build_array(" + ", ".join(sql_str(a) for a in s["afbeeldingen"]) + ")"
            uit.append(
                "insert into public.adviessecties (type_sleutel, volgorde, kop, tekst, afbeeldingen) values "
                f"({sql_str(t['sleutel'])}, {i}, {sql_str(s['kop'])}, {sql_str(s['tekst'])}, {afb_json});"
            )
        sys.stderr.write(f"{t['sleutel']}: {len(secties)} secties, "
                         f"{sum(len(s['afbeeldingen']) for s in secties)} beelden\n")
    print("\n".join(uit))


if __name__ == "__main__":
    main()
