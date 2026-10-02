-- Centrale beeldbank: elke tekening bestaat één keer en wordt vanuit de
-- adviessecties gekoppeld. Vervangen in de beeldbank werkt direct door in alle
-- adviestypes. De bestanden staan in de privé-bucket advies-beelden.

create table public.beelden (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                       -- vast nummer, bijv. B0001
  naam text unique
    check (naam is null or naam ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),  -- bijv. tops-v-hals-goed
  onderdeel text,                                  -- bijv. tops, broeken, tassen
  omschrijving text,
  figuur text check (figuur in ('X', 'A', 'V', 'H', '8')),
  advies text check (advies in ('goed', 'vermijd')),
  bijschrift text,                                 -- komt onder het beeld in de PDF
  status text not null default 'origineel'
    check (status in ('origineel', 'vervangen', 'goedgekeurd')),
  pad text not null,                               -- versie voor de PDF
  thumb_pad text,                                  -- kleine versie voor beheer
  origineel_pad text,                              -- onbewerkte upload
  vorige_pad text,                                 -- vorige versie (terugzetten)
  breedte integer check (breedte > 0),             -- afmetingen van het huidige bestand (px)
  hoogte integer check (hoogte > 0),
  verhouding_b integer check (verhouding_b > 0),   -- vereiste verhouding, bijv. 3:4
  verhouding_h integer check (verhouding_h > 0),
  min_breedte integer check (min_breedte > 0),     -- vereist minimaal formaat (px)
  min_hoogte integer check (min_hoogte > 0),
  bron_etag text,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

create trigger trg_beelden_bijgewerkt
  before update on public.beelden
  for each row execute function public.set_bijgewerkt_op();

create table public.sectie_beelden (
  sectie_id uuid not null references public.adviessecties(id) on delete cascade,
  volgorde integer not null,
  beeld_id uuid not null references public.beelden(id) on delete restrict,
  primary key (sectie_id, volgorde)
);
create index sectie_beelden_beeld_idx on public.sectie_beelden(beeld_id);

alter table public.adviestypes add column if not exists bijgewerkt_op timestamptz not null default now();
alter table public.adviessecties add column if not exists bijgewerkt_op timestamptz not null default now();

-- RLS aan, geen policies: alleen de service-role (server-side) heeft toegang.
alter table public.beelden enable row level security;
alter table public.sectie_beelden enable row level security;

-- Doorlopend nummer voor nieuwe beelden (B0001, B0002, ...).
create sequence public.beeld_code_seq;
create or replace function public.volgende_beeldcode()
returns text
language sql
security definer
set search_path = ''
as $$ select 'B' || lpad(nextval('public.beeld_code_seq')::text, 4, '0') $$;
revoke all on function public.volgende_beeldcode() from public, anon, authenticated;
grant execute on function public.volgende_beeldcode() to service_role;

-- ---------------------------------------------------------------------------
-- Datamigratie: de per type gekopieerde bestanden (1 bestand per voorkomen)
-- samenvoegen tot één beeld per uniek bestand (zelfde eTag = zelfde tekening).
-- ---------------------------------------------------------------------------
create temp table _gebruik as
select s.id as sectie_id, t.categorie, t.letter, s.volgorde as svolg, e.ord, e.pad,
       lower(regexp_replace(s.kop, '^Je\s+', '', 'i')) as onderdeel,
       o.metadata->>'eTag' as etag
from public.adviessecties s
join public.adviestypes t on t.sleutel = s.type_sleutel
cross join lateral jsonb_array_elements_text(s.afbeeldingen) with ordinality e(pad, ord)
join storage.objects o on o.bucket_id = 'advies-beelden' and o.name = e.pad;

create temp table _uniek as
select etag,
       (array_agg(pad order by categorie, letter, svolg, ord))[1] as pad,
       mode() within group (order by onderdeel) as onderdeel,
       min(array_position(array['X','A','V','H','8'], letter) * 1000000 + categorie * 10000 + svolg * 100 + ord) as eerste
from _gebruik
group by etag;

-- Ook bestanden die (nog) nergens gebruikt worden opnemen.
insert into _uniek (etag, pad, onderdeel, eerste)
select o.metadata->>'eTag', min(o.name), null, 999999999
from storage.objects o
where o.bucket_id = 'advies-beelden'
  and not exists (select 1 from _uniek u where u.etag = o.metadata->>'eTag')
group by o.metadata->>'eTag';

insert into public.beelden (code, onderdeel, pad, bron_etag)
select 'B' || lpad((row_number() over (order by eerste, pad))::text, 4, '0'), onderdeel, pad, etag
from _uniek;

select setval('public.beeld_code_seq', (select count(*) from public.beelden));

insert into public.sectie_beelden (sectie_id, volgorde, beeld_id)
select g.sectie_id,
       row_number() over (partition by g.sectie_id order by g.ord) - 1,
       b.id
from _gebruik g
join public.beelden b on b.bron_etag = g.etag;

drop table _gebruik;
drop table _uniek;
