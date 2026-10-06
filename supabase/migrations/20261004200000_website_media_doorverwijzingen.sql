-- Website-instellingen, mediabibliotheek en doorverwijzingen.

-- Mediabibliotheek ------------------------------------------------------------------
-- Eén overzicht van alle afbeeldingen voor de website (pagina's, blog, nieuwsbrief,
-- logo). Bestanden staan in de openbare bucket 'media' (of, voor oudere uploads, in
-- 'blog' / 'nieuwsbrief'); url is altijd het openbare https-adres.
create table public.media (
  id uuid primary key default gen_random_uuid(),
  bucket text not null,
  pad text not null,
  url text not null check (url ~ '^https://'),
  naam text not null,                 -- oorspronkelijke bestandsnaam
  alt text not null default '',       -- standaard-omschrijving
  mime text not null,
  grootte integer not null default 0, -- bytes
  breedte integer,
  hoogte integer,
  map text not null default 'algemeen',
  aangemaakt_op timestamptz not null default now(),
  unique (bucket, pad)
);
create index media_map on public.media (map, aangemaakt_op desc);
alter table public.media enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760,
        array['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'])
on conflict (id) do nothing;

-- Doorverwijzingen -----------------------------------------------------------------
create table public.doorverwijzingen (
  id uuid primary key default gen_random_uuid(),
  van text not null unique check (van ~ '^/[^?#\s]*$' and length(van) <= 300),
  naar text not null check ((naar ~ '^/' or naar ~ '^https?://') and length(naar) <= 1000),
  permanent boolean not null default true,  -- 301/308 i.p.v. 302/307
  automatisch boolean not null default false, -- aangemaakt bij het wijzigen van een webadres
  aantal_gebruikt integer not null default 0,
  laatst_gebruikt_op timestamptz,
  aangemaakt_op timestamptz not null default now(),
  check (van <> naar)
);
alter table public.doorverwijzingen enable row level security;

create function public.tel_doorverwijzing(p_van text) returns void language sql as $$
  update public.doorverwijzingen
     set aantal_gebruikt = aantal_gebruikt + 1, laatst_gebruikt_op = now()
   where van = p_van;
$$;
revoke execute on function public.tel_doorverwijzing(text) from public, anon, authenticated;

-- Website-instellingen (leeg = standaard uit de code) -------------------------------
insert into public.instellingen (sleutel, waarde, omschrijving) values
  ('site_naam', null, 'Naam van de website (tabbladtitel, zoekresultaten, delen).'),
  ('site_omschrijving', null, 'Korte omschrijving van de website voor zoekmachines.'),
  ('logo_url', null, 'Logo bovenaan de website (uit de mediabibliotheek).'),
  ('favicon_url', null, 'Pictogram in het browsertabblad (vierkant, uit de mediabibliotheek).'),
  ('deel_afbeelding_url', null, 'Standaardafbeelding bij delen op social media (1200×630).'),
  ('social_instagram', null, 'Instagram-adres'),
  ('social_facebook', null, 'Facebook-adres'),
  ('social_linkedin', null, 'LinkedIn-adres'),
  ('social_pinterest', null, 'Pinterest-adres'),
  ('social_youtube', null, 'YouTube-adres'),
  ('social_tiktok', null, 'TikTok-adres'),
  ('homepage_indeling', null, 'Volgorde en zichtbaarheid van de blokken op de homepage (JSON).')
on conflict (sleutel) do nothing;
