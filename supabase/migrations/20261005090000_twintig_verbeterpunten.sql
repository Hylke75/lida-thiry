-- Twintig verbeterpunten: logboek, foutlog, versies, cadeaubonnen kopen,
-- betaalherinnering, reviews, afspraken, A/B-tests, rollen en pushmeldingen.

-- Logboek van beheeracties ---------------------------------------------------------
create table public.beheer_log (
  id bigint generated always as identity primary key,
  gebruiker_id uuid,
  email text,
  actie text not null,                 -- bijv. 'pagina.publiceren', 'order.verwijderen'
  onderwerp_soort text,                -- bijv. 'pagina', 'order', 'relatie'
  onderwerp_id text,
  omschrijving text not null default '',
  details jsonb,
  op timestamptz not null default now()
);
create index beheer_log_op on public.beheer_log (op desc);
create index beheer_log_onderwerp on public.beheer_log (onderwerp_soort, onderwerp_id);
alter table public.beheer_log enable row level security;

-- Foutlog -----------------------------------------------------------------------------
-- Eén rij per soort fout (vingerafdruk); herhalingen verhogen 'aantal'.
create table public.fouten_log (
  id uuid primary key default gen_random_uuid(),
  vingerafdruk text not null unique,
  bron text not null,                  -- 'server', 'browser', 'cron', 'mail', ...
  bericht text not null,
  stack text,
  pad text,
  digest text,
  details jsonb,
  aantal integer not null default 1,
  eerst_op timestamptz not null default now(),
  laatst_op timestamptz not null default now(),
  gemeld_op timestamptz,               -- wanneer er een mail over is gestuurd
  opgelost boolean not null default false
);
create index fouten_log_laatst on public.fouten_log (opgelost, laatst_op desc);
alter table public.fouten_log enable row level security;

create function public.registreer_fout(
  p_vingerafdruk text, p_bron text, p_bericht text, p_stack text, p_pad text, p_digest text, p_details jsonb
) returns public.fouten_log language sql as $$
  insert into public.fouten_log (vingerafdruk, bron, bericht, stack, pad, digest, details)
  values (p_vingerafdruk, p_bron, left(p_bericht, 2000), left(p_stack, 8000), left(p_pad, 500), p_digest, p_details)
  on conflict (vingerafdruk) do update
    set aantal = public.fouten_log.aantal + 1,
        laatst_op = now(),
        opgelost = false,
        pad = coalesce(excluded.pad, public.fouten_log.pad),
        digest = coalesce(excluded.digest, public.fouten_log.digest)
  returning *;
$$;
revoke execute on function public.registreer_fout(text, text, text, text, text, text, jsonb) from public, anon, authenticated;

-- Versiegeschiedenis -----------------------------------------------------------------
create table public.versies (
  id uuid primary key default gen_random_uuid(),
  soort text not null check (soort in ('pagina', 'blog', 'tekst')),
  ref text not null,                   -- id van de pagina/het bericht, of de sectiesleutel
  inhoud jsonb not null,               -- volledige momentopname
  omschrijving text not null default '',
  gemaakt_door text,
  op timestamptz not null default now()
);
create index versies_ref on public.versies (soort, ref, op desc);
alter table public.versies enable row level security;

-- Cadeaubonnen kopen ---------------------------------------------------------------
create table public.cadeaubon_bestellingen (
  id uuid primary key default gen_random_uuid(),
  koper_naam text not null,
  koper_email text not null check (koper_email = lower(koper_email)),
  ontvanger_naam text,
  ontvanger_email text check (ontvanger_email is null or ontvanger_email = lower(ontvanger_email)),
  boodschap text,
  bezorging text not null default 'koper' check (bezorging in ('koper', 'ontvanger')),
  verzend_op date,                     -- optioneel: bon later naar de ontvanger sturen
  bedrag_cent integer not null check (bedrag_cent between 500 and 100000),
  valuta text not null default 'EUR',
  status text not null default 'aangemaakt'
    check (status in ('aangemaakt', 'betaald', 'verzonden', 'mislukt', 'verlopen')),
  mollie_payment_id text unique,
  kortingscode_id uuid references public.kortingscodes(id) on delete set null,
  factuur_pad text,
  betaald_op timestamptz,
  verzonden_op timestamptz,
  aangemaakt_op timestamptz not null default now()
);
create index cadeaubon_bestellingen_status on public.cadeaubon_bestellingen (status, aangemaakt_op desc);
alter table public.cadeaubon_bestellingen enable row level security;

-- Betaalherinnering bij afgebroken bestellingen ---------------------------------------
alter table public.orders add column if not exists betaalherinnering_op timestamptz;

-- Reviews (beoordelingen) ------------------------------------------------------------
create table public.beoordelingen (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  token text not null unique
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  naam text,                           -- zoals getoond, bijv. "Anna, Utrecht"
  email text,
  sterren integer check (sterren between 1 and 5),
  tekst text,
  toestemming_publicatie boolean not null default false,
  status text not null default 'uitgenodigd'
    check (status in ('uitgenodigd', 'ingevuld', 'goedgekeurd', 'afgewezen')),
  uitgenodigd_op timestamptz,
  ingevuld_op timestamptz,
  beoordeeld_op timestamptz,
  aangemaakt_op timestamptz not null default now()
);
create unique index beoordelingen_order on public.beoordelingen (order_id) where order_id is not null;
create index beoordelingen_status on public.beoordelingen (status, ingevuld_op desc);
alter table public.beoordelingen enable row level security;

-- Afspraken ---------------------------------------------------------------------------
create table public.afspraak_soorten (
  id uuid primary key default gen_random_uuid(),
  naam text not null,
  omschrijving text not null default '',
  duur_minuten integer not null check (duur_minuten between 10 and 480),
  prijs_cent integer not null default 0 check (prijs_cent >= 0),
  aanbetaling_cent integer not null default 0 check (aanbetaling_cent >= 0),
  locatie text not null default '',    -- bijv. adres of "Online (videobellen)"
  online boolean not null default false,
  buffer_minuten integer not null default 15 check (buffer_minuten between 0 and 240),
  actief boolean not null default true,
  volgorde integer not null default 0,
  aangemaakt_op timestamptz not null default now(),
  check (aanbetaling_cent <= prijs_cent or prijs_cent = 0)
);
alter table public.afspraak_soorten enable row level security;

-- Vaste beschikbaarheid per weekdag (1 = maandag … 7 = zondag), in Nederlandse tijd.
create table public.beschikbaarheid (
  id uuid primary key default gen_random_uuid(),
  weekdag integer not null check (weekdag between 1 and 7),
  van time not null,
  tot time not null,
  check (tot > van)
);
alter table public.beschikbaarheid enable row level security;

-- Vrije dagen / blokkades.
create table public.afspraak_blokkades (
  id uuid primary key default gen_random_uuid(),
  van timestamptz not null,
  tot timestamptz not null,
  reden text not null default '',
  check (tot > van)
);
alter table public.afspraak_blokkades enable row level security;

create table public.afspraken (
  id uuid primary key default gen_random_uuid(),
  soort_id uuid references public.afspraak_soorten(id) on delete set null,
  relatie_id uuid references public.relaties(id) on delete set null,
  naam text not null,
  email text not null check (email = lower(email)),
  telefoon text,
  opmerking text,
  start_op timestamptz not null,
  eind_op timestamptz not null,
  status text not null default 'aangevraagd'
    check (status in ('wacht_op_betaling', 'aangevraagd', 'bevestigd', 'geannuleerd', 'afgerond', 'niet_verschenen')),
  token text not null unique
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  aanbetaling_cent integer not null default 0,
  mollie_payment_id text unique,
  betaald_op timestamptz,
  herinnering_op timestamptz,
  notitie text not null default '',
  aangemaakt_op timestamptz not null default now(),
  check (eind_op > start_op)
);
create index afspraken_start on public.afspraken (start_op);
create index afspraken_status on public.afspraken (status, start_op);
alter table public.afspraken enable row level security;

insert into public.instellingen (sleutel, waarde, omschrijving) values
  ('afspraak_min_vooraf_uren', '24', 'Hoeveel uur van tevoren een afspraak minimaal geboekt moet worden.'),
  ('afspraak_max_vooruit_dagen', '60', 'Hoe ver vooruit afspraken geboekt kunnen worden (dagen).'),
  ('review_na_dagen', '7', 'Na hoeveel dagen na het advies klanten om een review worden gevraagd.'),
  ('betaalherinnering_na_uren', '24', 'Na hoeveel uur een herinnering gaat bij een niet-afgeronde betaling.')
on conflict (sleutel) do nothing;

-- Nieuwsbrief: A/B-test van de onderwerpregel ------------------------------------------
alter table public.nb_campagnes
  add column if not exists onderwerp_b text,
  add column if not exists ab_percentage integer check (ab_percentage is null or ab_percentage between 10 and 50),
  add column if not exists ab_winnaar text check (ab_winnaar is null or ab_winnaar in ('a', 'b'));
alter table public.nb_verzendingen
  add column if not exists variant text check (variant is null or variant in ('a', 'b'));

-- Rollen voor beheerders -------------------------------------------------------------
alter table public.beheerders
  add column if not exists rol text not null default 'eigenaar'
    check (rol in ('eigenaar', 'beheerder', 'redacteur'));

-- Pushmeldingen ------------------------------------------------------------------------
create table public.push_abonnementen (
  id uuid primary key default gen_random_uuid(),
  gebruiker_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  apparaat text,
  meldingen text[] not null default '{bestelling,bericht,afspraak}',
  aangemaakt_op timestamptz not null default now(),
  laatst_gebruikt_op timestamptz
);
alter table public.push_abonnementen enable row level security;
