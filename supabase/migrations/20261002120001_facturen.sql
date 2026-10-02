-- Facturen: doorlopende factuurnummers per jaar (LT-2026-0001), privé-bucket voor
-- de factuur-PDF's en verkopergegevens als instellingen.

alter table public.orders
  add column if not exists factuurnummer text unique,
  add column if not exists factuur_pad text;

-- Teller per jaar. Alleen server-side (service-role); geen policies.
create table public.factuurteller (
  jaar integer primary key,
  laatste integer not null default 0
);
alter table public.factuurteller enable row level security;

-- Reserveert atomair het volgende volgnummer voor een jaar (rij-lock via upsert).
create or replace function public.volgend_factuurvolgnummer(p_jaar integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  nummer integer;
begin
  insert into public.factuurteller as t (jaar, laatste)
  values (p_jaar, 1)
  on conflict (jaar) do update set laatste = t.laatste + 1
  returning t.laatste into nummer;
  return nummer;
end;
$$;

revoke all on function public.volgend_factuurvolgnummer(integer) from public, anon, authenticated;

-- Privé Storage-bucket voor factuur-PDF's. Toegang alleen server-side; geen publieke policies.
insert into storage.buckets (id, name, public)
values ('facturen', 'facturen', false)
on conflict (id) do nothing;

-- Verkopergegevens op de factuur (OPEN: in te vullen door de adviseur).
insert into public.instellingen (sleutel, waarde, omschrijving) values
  ('bedrijfsnaam', null, 'Bedrijfsnaam op de factuur (OPEN).'),
  ('bedrijf_adres', null, 'Bedrijfsadres op de factuur; meerdere regels toegestaan (OPEN).'),
  ('kvk_nummer', null, 'KvK-nummer op de factuur (OPEN).'),
  ('btw_nummer', null, 'Btw-identificatienummer op de factuur (OPEN).'),
  ('contact_email', null, 'Contact-e-mailadres op de factuur (OPEN).')
on conflict (sleutel) do nothing;
grant execute on function public.volgend_factuurvolgnummer(integer) to service_role;
