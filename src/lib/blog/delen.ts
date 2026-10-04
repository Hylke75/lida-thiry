// Deellinks voor een blogbericht: gewone links, geen scripts van derden.

export interface DeelLink {
  id: "whatsapp" | "facebook" | "linkedin" | "email";
  label: string;
  href: string;
}

export function deelLinks(url: string, titel: string): DeelLink[] {
  const u = encodeURIComponent(url);
  return [
    { id: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${titel} ${url}`)}` },
    { id: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: "linkedin", label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    {
      id: "email",
      label: "E-mail",
      href: `mailto:?subject=${encodeURIComponent(titel)}&body=${encodeURIComponent(`Dit vond ik interessant: ${url}`)}`,
    },
  ];
}
