import type { ReactNode } from "react";
import type { SocialLink, SocialNetwerk } from "@/lib/website/instellingen";

// Eenvoudige lijn-iconen (24×24, currentColor), zodat ze de huisstijlkleur volgen.
const PADEN: Record<SocialNetwerk, ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
  linkedin: (
    <>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </>
  ),
  pinterest: (
    <>
      <circle cx="12" cy="12" r="9.5" />
      <path d="M9.5 20.5 12 10" />
      <path d="M10.8 15.2c.6.5 1.4.8 2.2.8 2.5 0 4-2.2 4-4.6C17 8.9 15 7 12.3 7 9.4 7 7.5 9 7.5 11.4c0 1 .4 1.9 1 2.4" />
    </>
  ),
  youtube: (
    <>
      <path d="M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.6 49.6 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.6 49.6 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </>
  ),
  tiktok: (
    <>
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.4 2.6 2.4 4.6 5 5" />
    </>
  ),
};

export function SocialIcoon({ netwerk, className = "h-5 w-5" }: { netwerk: SocialNetwerk; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {PADEN[netwerk]}
    </svg>
  );
}

/** Rij met social-media-links (alleen ingestelde netwerken). */
export function SocialIconen({ links, siteNaam }: { links: readonly SocialLink[]; siteNaam: string }) {
  if (links.length === 0) return null;
  return (
    <ul aria-label="Social media" className="flex items-center gap-1">
      {links.map((l) => (
        <li key={l.netwerk}>
          <a
            href={l.url}
            target="_blank"
            rel="me noopener"
            aria-label={`${siteNaam} op ${l.label} (opent in een nieuw tabblad)`}
            title={l.label}
            className="flex h-9 w-9 items-center justify-center rounded-full text-foreground/60 transition-colors hover:bg-accent-zacht hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <SocialIcoon netwerk={l.netwerk} />
          </a>
        </li>
      ))}
    </ul>
  );
}
