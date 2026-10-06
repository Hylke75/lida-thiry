-- Verkoop- en bestelbeheer: handmatige bestellingen, terugbetalen met creditnota,
-- instelbare btw/productnaam/betaalomschrijving/termijnen en cadeaubon-instellingen.
-- Idempotent.

-- Status 'terugbetaald': volledig terugbetaald en de toegang tot de test ingetrokken.
-- Valt buiten alle lijsten in src/lib/order-status.ts (geen toegang, geen omzet).
alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders
  add constraint orders_status_check check (status in (
    'aangemaakt', 'betaald', 'test_afgerond',
    'handmatige_beoordeling', 'advies_verzonden',
    'betaling_mislukt', 'verlopen', 'terugbetaald'
  ));

-- Hoe er betaald is. Leeg bij oudere bestellingen (Mollie of kortingscode).
alter table public.orders add column if not exists betaalwijze text;
alter table public.orders drop constraint if exists orders_betaalwijze_check;
alter table public.orders
  add constraint orders_betaalwijze_check
  check (betaalwijze is null or betaalwijze in ('mollie', 'korting', 'overboeking', 'gratis'));

-- De status vóór het intrekken van de toegang (om terug te kunnen zetten).
alter table public.orders add column if not exists status_voor_terugbetaling text;
-- Interne notitie van de beheerder (bijv. bij een handmatige bestelling).
alter table public.orders add column if not exists beheer_notitie text;
-- Het btw-tarief zoals het op de factuur staat (leeg = van vóór deze instelling: 21).
alter table public.orders add column if not exists btw_procent integer
  check (btw_procent is null or btw_procent between 0 and 99);
alter table public.cadeaubon_bestellingen add column if not exists btw_procent integer
  check (btw_procent is null or btw_procent between 0 and 99);

-- Terugbetaalde aanbetaling van een afspraak (centen).
alter table public.afspraken add column if not exists terugbetaald_cent integer not null default 0;

-- Creditnota's -----------------------------------------------------------------------
-- Een creditnota is een negatieve factuur: hij krijgt een nummer uit dezelfde
-- doorlopende reeks als de facturen (LT-2026-0013) en verwijst naar het nummer van
-- de oorspronkelijke factuur. Zo blijft de reeks zonder gaten en kan één factuur
-- meerdere (deel)creditnota's hebben.
create table if not exists public.creditnotas (
  id uuid primary key default gen_random_uuid(),
  soort text not null check (soort in ('order', 'cadeaubon')),
  order_id uuid references public.orders(id) on delete restrict,
  cadeaubon_id uuid references public.cadeaubon_bestellingen(id) on delete restrict,
  nummer text not null unique,
  origineel_nummer text,
  bedrag_cent integer not null check (bedrag_cent > 0),
  btw_procent integer not null check (btw_procent between 0 and 99),
  valuta text not null default 'EUR',
  reden text,
  mollie_refund_id text,
  pad text,
  gemaild_op timestamptz,
  aangemaakt_door text,
  aangemaakt_op timestamptz not null default now(),
  check ((soort = 'order' and order_id is not null) or (soort = 'cadeaubon' and cadeaubon_id is not null))
);
create index if not exists creditnotas_order on public.creditnotas (order_id);
create index if not exists creditnotas_cadeaubon on public.creditnotas (cadeaubon_id);
create index if not exists creditnotas_datum on public.creditnotas (aangemaakt_op);
alter table public.creditnotas enable row level security;
-- Geen policies: alleen de service-role (server-side) heeft toegang.

-- Maakt een creditnota aan met het volgende nummer uit de factuurreeks, in één
-- transactie (rij-lock op de bestelling/cadeaubon). Geeft id en nummer terug.
create or replace function public.maak_creditnota(
  p_soort text,
  p_bron_id uuid,
  p_jaar integer,
  p_bedrag_cent integer,
  p_btw_procent integer,
  p_valuta text,
  p_reden text,
  p_door text
)
returns table (id uuid, nummer text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  origineel text;
  volgnummer integer;
  nieuw text;
  nieuw_id uuid;
begin
  if p_soort = 'order' then
    select o.factuurnummer into origineel from public.orders o where o.id = p_bron_id for update;
  elsif p_soort = 'cadeaubon' then
    select c.factuurnummer into origineel from public.cadeaubon_bestellingen c where c.id = p_bron_id for update;
  else
    raise exception 'Onbekende soort: %', p_soort;
  end if;
  if not found then
    raise exception 'Niet gevonden: % %', p_soort, p_bron_id;
  end if;

  volgnummer := public.volgend_factuurvolgnummer(p_jaar);
  -- Zelfde formaat als formatteerFactuurnummer: LT-2026-0001 (minstens 4 cijfers).
  nieuw := 'LT-' || p_jaar::text || '-'
    || case when length(volgnummer::text) >= 4 then volgnummer::text else lpad(volgnummer::text, 4, '0') end;

  insert into public.creditnotas
    (soort, order_id, cadeaubon_id, nummer, origineel_nummer, bedrag_cent, btw_procent, valuta, reden, aangemaakt_door)
  values (
    p_soort,
    case when p_soort = 'order' then p_bron_id end,
    case when p_soort = 'cadeaubon' then p_bron_id end,
    nieuw, origineel, p_bedrag_cent, p_btw_procent, coalesce(p_valuta, 'EUR'), p_reden, p_door
  )
  returning creditnotas.id into nieuw_id;

  return query select nieuw_id, nieuw;
end;
$$;

revoke all on function public.maak_creditnota(text, uuid, integer, integer, integer, text, text, text)
  from public, anon, authenticated;
grant execute on function public.maak_creditnota(text, uuid, integer, integer, integer, text, text, text)
  to service_role;

-- Nieuwe instellingen met hun standaardwaarden (gelijk aan het gedrag van vóór
-- deze instellingen). Bestaande waarden blijven staan.
insert into public.instellingen (sleutel, waarde, omschrijving) values
  ('btw_procent', '21', 'Btw-tarief in procenten op facturen, creditnota''s en exports.'),
  ('product_naam', 'Persoonlijke kledingadviestest', 'Naam van de test in de bevestigingsmail, op de factuur en in de gegevens voor zoekmachines.'),
  ('betaling_omschrijving', 'Kledingadviestest – Lida Thiry', 'Omschrijving van de Mollie-betaling (bankafschrift). Bij een cadeaubon komt er ''Cadeaubon'' voor.'),
  ('betaalherinnering_max_dagen', '7', 'Bestellingen ouder dan dit (dagen) krijgen geen betaalherinnering meer.'),
  ('betaalherinnering_link_dagen', '7', 'Zo lang (dagen) blijft de link in de betaalherinnering geldig.'),
  ('review_max_dagen', '60', 'Advies langer geleden verzonden dan dit (dagen): geen automatische reviewuitnodiging.'),
  ('testlink_zichtbaar_uren', '2', 'Zo lang (uren) na betalen toont de bedankpagina de knop naar de test.'),
  ('cadeaubon_vaste_bedragen', '2000,3500,5000', 'Vaste bedragen op het cadeaubonformulier (centen, komma-gescheiden).'),
  ('cadeaubon_min_cent', '500', 'Minimaal bedrag van een cadeaubon (centen).'),
  ('cadeaubon_max_cent', '50000', 'Maximaal bedrag van een cadeaubon (centen); nooit meer dan de prijs van de test.'),
  ('cadeaubon_geldig_maanden', '12', 'Zo lang (maanden) is een cadeaubon geldig na betaling of de geplande verzenddatum.'),
  ('cadeaubon_max_vooruit_dagen', '183', 'Zo ver vooruit (dagen) mag een cadeaubon gepland worden.')
on conflict (sleutel) do nothing;
