-- Adresboek (relaties), contactformulier, nieuwsbrief-aanmeldformulieren en
-- beheerbare pagina's.

-- Adresboek -------------------------------------------------------------------------
-- Eén rij per persoon. Gekoppeld aan bestellingen, nieuwsbriefcontacten en
-- contactberichten via het e-mailadres (kleine letters).
create table public.relaties (
  id uuid primary key default gen_random_uuid(),
  email text check (email is null or (email = lower(email) and position('@' in email) > 1)),
  voornaam text,
  achternaam text,
  telefoon text,
  bedrijf text,
  straat text,          -- straat + huisnummer
  postcode text,
  plaats text,
  land text not null default 'Nederland',
  geboortedatum date,
  notities text not null default '',
  tags text[] not null default '{}',
  bron text not null default 'handmatig'
    check (bron in ('handmatig', 'bestelling', 'nieuwsbrief', 'contactformulier', 'import')),
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);
create unique index relaties_email on public.relaties (email) where email is not null;
create index relaties_tags on public.relaties using gin (tags);
create index relaties_naam on public.relaties (lower(achternaam), lower(voornaam));
create trigger trg_relaties_bijgewerkt
  before update on public.relaties
  for each row execute function public.set_bijgewerkt_op();
alter table public.relaties enable row level security;

-- Contactformulier ------------------------------------------------------------------
create table public.contact_berichten (
  id uuid primary key default gen_random_uuid(),
  relatie_id uuid references public.relaties(id) on delete set null,
  naam text not null,
  email text not null check (email = lower(email)),
  telefoon text,
  onderwerp text not null default '',
  bericht text not null check (length(bericht) between 1 and 10000),
  status text not null default 'nieuw'
    check (status in ('nieuw', 'gelezen', 'beantwoord', 'gearchiveerd', 'spam')),
  pagina text,               -- waar het formulier is ingevuld
  notitie text not null default '',
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);
create index contact_berichten_status on public.contact_berichten (status, aangemaakt_op desc);
create index contact_berichten_email on public.contact_berichten (email);
create trigger trg_contact_berichten_bijgewerkt
  before update on public.contact_berichten
  for each row execute function public.set_bijgewerkt_op();
alter table public.contact_berichten enable row level security;

create table public.contact_antwoorden (
  id uuid primary key default gen_random_uuid(),
  bericht_id uuid not null references public.contact_berichten(id) on delete cascade,
  tekst text not null,
  verzonden_door text,       -- e-mailadres van de beheerder
  resend_id text,
  verzonden_op timestamptz not null default now()
);
create index contact_antwoorden_bericht on public.contact_antwoorden (bericht_id);
alter table public.contact_antwoorden enable row level security;

-- Nieuwsbrief-aanmeldformulieren ----------------------------------------------------
create table public.nb_formulieren (
  id uuid primary key default gen_random_uuid(),
  naam text not null,                         -- interne naam
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60),
  titel text not null default '',
  tekst text not null default '',             -- opmaak
  knop text not null default 'Aanmelden',
  succes_tekst text not null default 'Bijna klaar! Check je mailbox en bevestig je aanmelding.',
  toestemming_tekst text not null default '',  -- opmaak; wordt bij het contact opgeslagen
  naam_veld text not null default 'optioneel' check (naam_veld in ('verborgen', 'optioneel', 'verplicht')),
  tags text[] not null default '{}',          -- krijgen nieuwe aanmelders automatisch
  dubbele_opt_in boolean not null default true,
  eigen_pagina boolean not null default true, -- bereikbaar op /nieuwsbrief/<slug>
  actief boolean not null default true,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);
create trigger trg_nb_formulieren_bijgewerkt
  before update on public.nb_formulieren
  for each row execute function public.set_bijgewerkt_op();
alter table public.nb_formulieren enable row level security;

alter table public.nb_contacten
  add column formulier_id uuid references public.nb_formulieren(id) on delete set null;
create index nb_contacten_formulier on public.nb_contacten (formulier_id);

-- Pagina's --------------------------------------------------------------------------
create table public.paginas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  titel text not null check (length(titel) between 1 and 200),
  intro text not null default '',
  inhoud text not null default '',            -- opmaak, met blokken als {contactformulier}
  omslag_url text check (omslag_url is null or omslag_url ~ '^https://'),
  omslag_alt text not null default '',
  status text not null default 'concept' check (status in ('concept', 'gepubliceerd')),
  in_menu boolean not null default false,
  in_footer boolean not null default false,
  menu_label text not null default '',
  volgorde integer not null default 0,
  seo_titel text not null default '',
  seo_omschrijving text not null default '',
  niet_indexeren boolean not null default false,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);
create index paginas_menu on public.paginas (status, in_menu, volgorde);
create trigger trg_paginas_bijgewerkt
  before update on public.paginas
  for each row execute function public.set_bijgewerkt_op();
alter table public.paginas enable row level security;

-- Adresboek vullen vanuit bestaande gegevens ---------------------------------------
-- Bestellingen: de meest recente naam en factuuradres per e-mailadres.
insert into public.relaties (email, voornaam, achternaam, straat, postcode, plaats, bron, aangemaakt_op)
select distinct on (lower(trim(o.email)))
  lower(trim(o.email)),
  nullif(split_part(trim(o.klantnaam), ' ', 1), ''),
  nullif(trim(substr(trim(o.klantnaam), length(split_part(trim(o.klantnaam), ' ', 1)) + 1)), ''),
  nullif(trim(o.factuurgegevens ->> 'adres'), ''),
  nullif(trim(o.factuurgegevens ->> 'postcode'), ''),
  nullif(trim(o.factuurgegevens ->> 'plaats'), ''),
  'bestelling',
  o.aangemaakt_op
from public.orders o
where position('@' in o.email) > 1
order by lower(trim(o.email)), o.aangemaakt_op desc
on conflict do nothing;

-- Nieuwsbriefcontacten die nog niet in het adresboek staan.
insert into public.relaties (email, voornaam, achternaam, bron, aangemaakt_op)
select c.email,
       nullif(split_part(trim(coalesce(c.naam, '')), ' ', 1), ''),
       nullif(trim(substr(trim(coalesce(c.naam, '')), length(split_part(trim(coalesce(c.naam, '')), ' ', 1)) + 1)), ''),
       'nieuwsbrief',
       c.aangemaakt_op
from public.nb_contacten c
where not exists (select 1 from public.relaties r where r.email = c.email)
on conflict do nothing;
