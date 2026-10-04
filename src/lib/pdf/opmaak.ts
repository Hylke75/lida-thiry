// Eenvoudige opmaak voor de adviesteksten (zoals in de editor uitgelegd):
// - lege regel = nieuwe alinea; regels direct onder elkaar worden samengevoegd
// - regel die begint met "- " of "• " = opsommingspunt
// - **vet** (bijv. modelnamen: "**Bootcut**: ...") en *cursief* (bijv. tips)

export interface Deel {
  tekst: string;
  vet: boolean;
  cursief: boolean;
}

export interface Blok {
  type: "bullet" | "para";
  tekst: string;
}

/** Ruimt resten uit de Word-export op (onderstreping, regel-afbreek-backslashes). */
export function schoon(tekst: string): string {
  return tekst
    .replace(/<u>(.*?)<\/u>/g, "**$1**")
    .replace(/<\/?[a-z][^>]*>/gi, "")
    .replace(/\\$/gm, "")
    .trim();
}

/** Zonder opmaaktekens (voor koppen en de inhoudsopgave). */
export function zonderOpmaak(tekst: string): string {
  return schoon(tekst).replace(/\*+/g, "");
}

export function blokken(tekst: string): Blok[] {
  const uit: Blok[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      uit.push({ type: "para", tekst: para.join(" ") });
      para = [];
    }
  };
  for (const ruw of schoon(tekst).split("\n")) {
    const regel = ruw.trim();
    if (!regel) {
      flush();
      continue;
    }
    if (/^[-•]\s+/.test(regel)) {
      flush();
      uit.push({ type: "bullet", tekst: regel.replace(/^[-•]\s+/, "") });
    } else {
      para.push(regel);
    }
  }
  flush();
  return uit;
}

/** Splitst een regel in delen met vet/cursief. Losse sterretjes blijven tekst. */
export function inlineDelen(tekst: string): Deel[] {
  const delen: Deel[] = [];
  const re = /\*\*(.+?)\*\*|\*(\S(?:.*?\S)?)\*/g;
  let pos = 0;
  for (let m = re.exec(tekst); m; m = re.exec(tekst)) {
    if (m.index > pos) delen.push({ tekst: tekst.slice(pos, m.index), vet: false, cursief: false });
    if (m[1] !== undefined) {
      // Cursief binnen vet ondersteunen we eenvoudig: hele deel vet.
      delen.push({ tekst: m[1].replace(/\*/g, ""), vet: true, cursief: false });
    } else {
      delen.push({ tekst: m[2], vet: false, cursief: true });
    }
    pos = m.index + m[0].length;
  }
  if (pos < tekst.length) delen.push({ tekst: tekst.slice(pos), vet: false, cursief: false });
  return delen.filter((d) => d.tekst.length > 0);
}
