-- Betalingen herstellen: kortingsclaim bij het aanmaken, herstartbare afhandeling
-- na betaling, terugbetalingen/chargebacks bijhouden en factuurnummers in één
-- transactie toekennen (ook voor cadeaubonnen). Idempotent.

-- Kortingscode/cadeaubon: is het gebruik door deze bestelling al geteld (geclaimd)?
-- Nieuwe bestellingen claimen bij het aanmaken; oudere (niet-geclaimde) worden
-- na betaling nog één keer geteld. Betaalde bestellingen zijn al geteld.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'orders' and column_name = 'korting_geclaimd'
  ) then
    alter table public.orders add column korting_geclaimd boolean not null default false;
    update public.orders
       set korting_geclaimd = true
     where kortingscode is not null
       and status in ('betaald', 'test_afgerond', 'handmatige_beoordeling', 'advies_verzonden');
  end if;
end;
$$;

-- Afhandeling na betaling (factuur, mail, ...): klaar-moment en laatste poging.
-- Is klaar leeg bij een betaalde bestelling, dan herhalen de webhook en de
-- nachtelijke cron de afhandeling. Bestaande betaalde bestellingen gelden als klaar.
alter table public.orders add column if not exists nabetaling_poging_op timestamptz;
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'orders' and column_name = 'nabetaling_klaar_op'
  ) then
    alter table public.orders add column nabetaling_klaar_op timestamptz;
    update public.orders
       set nabetaling_klaar_op = coalesce(betaald_op, aangemaakt_op)
     where status in ('betaald', 'test_afgerond', 'handmatige_beoordeling', 'advies_verzonden');
  end if;
end;
$$;

create index if not exists orders_nabetaling_open
  on public.orders (betaald_op)
  where nabetaling_klaar_op is null;

-- Terugbetaald + teruggeboekt bedrag (centen) zoals laatst gemeld; een stijging
-- levert één beheermelding op.
alter table public.orders add column if not exists terugbetaald_cent integer not null default 0;
alter table public.cadeaubon_bestellingen add column if not exists terugbetaald_cent integer not null default 0;

-- Factuurnummer van een cadeaubon (net als bij orders); bestaande uit het pad.
alter table public.cadeaubon_bestellingen add column if not exists factuurnummer text unique;
update public.cadeaubon_bestellingen
   set factuurnummer = regexp_replace(factuur_pad, '\.pdf$', '')
 where factuurnummer is null
   and factuur_pad is not null;

-- Kent een factuurnummer toe aan een order ('order') of cadeaubon ('cadeaubon'):
-- reserveren en vastleggen in één transactie (rij-lock), zodat er geen nummers
-- verloren gaan. Heeft de rij al een nummer, dan komt dat terug.
create or replace function public.ken_factuurnummer_toe(p_soort text, p_id uuid, p_jaar integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  bestaand text;
  volgnummer integer;
  nieuw text;
begin
  if p_soort = 'order' then
    select o.factuurnummer into bestaand from public.orders o where o.id = p_id for update;
  elsif p_soort = 'cadeaubon' then
    select c.factuurnummer into bestaand from public.cadeaubon_bestellingen c where c.id = p_id for update;
  else
    raise exception 'Onbekende soort: %', p_soort;
  end if;
  if not found then
    raise exception 'Niet gevonden: % %', p_soort, p_id;
  end if;
  if bestaand is not null then
    return bestaand;
  end if;

  volgnummer := public.volgend_factuurvolgnummer(p_jaar);
  -- Zelfde formaat als formatteerFactuurnummer: LT-2026-0001 (minstens 4 cijfers).
  nieuw := 'LT-' || p_jaar::text || '-'
    || case when length(volgnummer::text) >= 4 then volgnummer::text else lpad(volgnummer::text, 4, '0') end;

  if p_soort = 'order' then
    update public.orders set factuurnummer = nieuw where id = p_id;
  else
    update public.cadeaubon_bestellingen set factuurnummer = nieuw where id = p_id;
  end if;
  return nieuw;
end;
$$;

revoke all on function public.ken_factuurnummer_toe(text, uuid, integer) from public, anon, authenticated;
grant execute on function public.ken_factuurnummer_toe(text, uuid, integer) to service_role;
