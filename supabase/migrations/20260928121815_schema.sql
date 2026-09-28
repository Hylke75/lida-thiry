-- Fase 2 - basisschema voor de figuurtype-zelftest.
-- RLS staat aan op ELKE tabel. Alle toegang tot de datatabellen loopt server-side
-- via de service-role (die RLS omzeilt); anon/authenticated krijgen geen policies.
-- Klanttoegang verloopt via de testtoken die de server valideert.

create extension if not exists pgcrypto;

-- Bestellingen ------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  klantnaam text not null,
  email text not null,
  factuurgegevens jsonb not null default '{}'::jsonb,
  voorwaarden_akkoord boolean not null default false,
  directe_levering_akkoord boolean not null default false,
  status text not null default 'aangemaakt'
    check (status in (
      'aangemaakt', 'betaald', 'test_afgerond',
      'handmatige_beoordeling', 'advies_verzonden',
      'betaling_mislukt', 'verlopen'
    )),
  mollie_payment_id text,
  bedrag_cent integer,
  valuta text not null default 'EUR',
  testtoken text unique,
  token_verloopt_op timestamptz,
  toegekend_type text,
  aangemaakt_op timestamptz not null default now(),
  betaald_op timestamptz,
  afgerond_op timestamptz
);

-- Adviestypes (de 60 types) -----------------------------------------------------
create table public.adviestypes (
  sleutel text primary key,               -- bijv. '8X'
  letter text not null,                   -- X, A, V, H, 8
  categorie integer not null check (categorie between 1 and 12),
  titel text not null,
  lengte_label text,
  maat_label text,
  aangemaakt_op timestamptz not null default now()
);

alter table public.orders
  add constraint orders_toegekend_type_fkey
  foreign key (toegekend_type) references public.adviestypes(sleutel);

-- Adviessecties (secties per type) ----------------------------------------------
create table public.adviessecties (
  id uuid primary key default gen_random_uuid(),
  type_sleutel text not null references public.adviestypes(sleutel) on delete cascade,
  volgorde integer not null,
  kop text not null,
  tekst text not null default '',
  afbeeldingen jsonb not null default '[]'::jsonb,
  unique (type_sleutel, volgorde)
);

-- Testresultaten (maten + uitkomst per order) -----------------------------------
create table public.testresultaten (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  lengte_cm integer,
  gewicht_kg integer,
  categorie integer check (categorie between 1 and 12),
  borst integer,
  taille integer,
  hoge_heup integer,
  heup integer,
  binnenbeen integer,
  schouder integer,
  controlemetingen jsonb not null default '{}'::jsonb,
  gekozen_silhouet text,
  pasvormantwoorden jsonb not null default '{}'::jsonb,
  ffit_type text,
  letter text,
  maten_verwijderen_op timestamptz,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

-- Operationele instellingen (configureerbare OPEN-waarden) ----------------------
create table public.instellingen (
  sleutel text primary key,
  waarde text,
  omschrijving text,
  bijgewerkt_op timestamptz not null default now()
);

-- Beheerders (adviseur-toegang via Supabase-auth) -------------------------------
create table public.beheerders (
  gebruiker_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  aangemaakt_op timestamptz not null default now()
);

-- Indexen -----------------------------------------------------------------------
create index orders_status_idx on public.orders(status);
create index orders_email_idx on public.orders(email);
create index orders_testtoken_idx on public.orders(testtoken);
create index adviessecties_type_idx on public.adviessecties(type_sleutel);
create index adviestypes_categorie_letter_idx on public.adviestypes(categorie, letter);

-- bijgewerkt_op automatisch bijhouden -------------------------------------------
create or replace function public.set_bijgewerkt_op()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.bijgewerkt_op = now();
  return new;
end;
$$;

create trigger trg_testresultaten_bijgewerkt
  before update on public.testresultaten
  for each row execute function public.set_bijgewerkt_op();

-- RLS aan op elke tabel ---------------------------------------------------------
alter table public.orders enable row level security;
alter table public.adviestypes enable row level security;
alter table public.adviessecties enable row level security;
alter table public.testresultaten enable row level security;
alter table public.instellingen enable row level security;
alter table public.beheerders enable row level security;

-- Geen policies voor anon/authenticated op de datatabellen: enkel de service-role
-- (server-side) heeft toegang. Een ingelogde beheerder mag zijn eigen rij lezen
-- om de admin-status te bepalen.
create policy "beheerder leest eigen rij" on public.beheerders
  for select to authenticated
  using (gebruiker_id = (select auth.uid()));
