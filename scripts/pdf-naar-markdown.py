#!/usr/bin/env python3
"""Zet een advies-PDF om naar Markdown met de vaste sectiekopjes.

De PDF-tekst heeft geen opmaak-markeringen; secties worden herkend doordat een
regel exact overeenkomt met een bekende sectienaam. Output gaat naar
~/Desktop/figuurtypes-advies-md/<SLEUTEL>/index.md zodat het bestaande
import-script (importeer-adviestypes.mjs) het kan inlezen.

Gebruik: python3 scripts/pdf-naar-markdown.py <pdf-pad> <SLEUTEL>
"""
import os
import re
import sys
import pypdf

SECTIES = [
    "je hebt", "je kledingplan", "je schouders", "je bovenlichaam",
    "je taille en middenrif", "je onderlichaam", "je kleuren en dessins",
    "je sieraden", "je sjaals", "je riemen en ceintuurs", "je schoenen",
    "je tassen", "je broeken", "je rokken", "je tops", "je jasjes en mantels",
    "je jasjes en mantels/coats", "je jurken", "tips", "voorbeeldoutfits",
]


def normaliseer(regel):
    s = regel.strip().lower().rstrip(":").strip()
    return s


def is_paginanummer(regel):
    return bool(re.fullmatch(r"\s*\d{1,3}\s*", regel))


def main():
    pdf_pad, sleutel = sys.argv[1], sys.argv[2]
    reader = pypdf.PdfReader(pdf_pad)
    tekst = "\n".join((p.extract_text() or "") for p in reader.pages)
    regels = tekst.split("\n")

    secties = []
    huidige = None
    for regel in regels:
        if is_paginanummer(regel):
            continue
        if normaliseer(regel) in SECTIES:
            kop = regel.strip().rstrip(":").strip()
            # Nette hoofdletter per kop.
            kop = kop[:1].upper() + kop[1:]
            huidige = {"kop": kop, "regels": []}
            secties.append(huidige)
        elif huidige is not None:
            r = regel.rstrip()
            r = re.sub(r"^\s*•\s*", "- ", r)  # bullets
            huidige["regels"].append(r)

    # Markdown opbouwen.
    uit = []
    for s in secties:
        body = "\n".join(s["regels"]).strip()
        body = re.sub(r"\n{3,}", "\n\n", body)
        uit.append(f"**{s['kop']}**\n\n{body}")
    md = "\n\n".join(uit) + "\n"

    doelmap = os.path.expanduser(f"~/Desktop/figuurtypes-advies-md/{sleutel}")
    os.makedirs(doelmap, exist_ok=True)
    with open(os.path.join(doelmap, "index.md"), "w", encoding="utf-8") as f:
        f.write(md)

    sys.stderr.write(f"{sleutel}: {len(secties)} secties -> {doelmap}/index.md\n")
    for s in secties:
        sys.stderr.write(f"  - {s['kop']}\n")


if __name__ == "__main__":
    main()
