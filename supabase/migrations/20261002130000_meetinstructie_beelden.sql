-- Meetfoto's die de adviseur zelf uploadt (Beheer -> Meetinstructies). Per maat
-- één foto; zonder foto toont de test de ingebouwde tekening.

-- Publieke bucket: de foto's zijn gewone instructiebeelden zonder persoonsgegevens
-- en worden via een publieke URL in de test getoond. Uploaden/verwijderen gebeurt
-- alleen server-side met de service-role; er zijn geen schrijf-policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'meetinstructies', 'meetinstructies', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create table public.meetinstructie_beelden (
  maat_sleutel text primary key
    check (maat_sleutel in ('schouder', 'borst', 'taille', 'hoge_heup', 'heup', 'binnenbeen')),
  pad text not null,
  bijgewerkt_op timestamptz not null default now()
);

create trigger trg_meetinstructie_beelden_bijgewerkt
  before update on public.meetinstructie_beelden
  for each row execute function public.set_bijgewerkt_op();

-- RLS aan, geen policies: alleen de service-role (server-side) heeft toegang.
alter table public.meetinstructie_beelden enable row level security;
