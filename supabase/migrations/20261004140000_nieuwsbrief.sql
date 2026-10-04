-- Nieuwsbrief / e-mailmarketing: contacten, campagnes (ook automatische mails),
-- verzendingen per ontvanger en kliks. Alles alleen server-side via de service-role.

-- Contacten ---------------------------------------------------------------------
create table public.nb_contacten (
  id uuid primary key default gen_random_uuid(),
  email text not null check (email = lower(email) and position('@' in email) > 1),
  naam text,
  status text not null default 'onbevestigd'
    check (status in ('onbevestigd', 'aangemeld', 'afgemeld', 'gebounced', 'klacht')),
  bron text not null default 'handmatig'
    check (bron in ('formulier', 'bestelling', 'import', 'handmatig')),
  tags text[] not null default '{}',
  -- Persoonlijke, geheime sleutel voor bevestigen en afmelden.
  token text not null unique
    default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  -- Bewijs van toestemming (AVG): wanneer en met welke tekst.
  toestemming_op timestamptz,
  toestemming_tekst text,
  bevestigd_op timestamptz,
  afgemeld_op timestamptz,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);
create unique index nb_contacten_email on public.nb_contacten (email);
create index nb_contacten_status on public.nb_contacten (status);
create index nb_contacten_tags on public.nb_contacten using gin (tags);
create trigger trg_nb_contacten_bijgewerkt
  before update on public.nb_contacten
  for each row execute function public.set_bijgewerkt_op();

-- Campagnes en automatische mails --------------------------------------------------
create table public.nb_campagnes (
  id uuid primary key default gen_random_uuid(),
  soort text not null default 'campagne' check (soort in ('campagne', 'automatisch')),
  naam text not null,
  onderwerp text not null default '',
  preheader text not null default '',
  blokken jsonb not null default '[]'::jsonb check (jsonb_typeof(blokken) = 'array'),
  -- Zie src/lib/nieuwsbrief/doelgroep.ts (tags, zonderTags, bronnen, figuurtypes, besteld).
  doelgroep jsonb not null default '{}'::jsonb check (jsonb_typeof(doelgroep) = 'object'),
  status text not null default 'concept'
    check (status in ('concept', 'ingepland', 'bezig', 'verzonden', 'gepauzeerd')),
  ingepland_op timestamptz,
  gestart_op timestamptz,
  verzonden_op timestamptz,
  -- Alleen voor soort = 'automatisch'.
  trigger text check (trigger in ('aanmelding', 'advies')),
  vertraging_dagen integer not null default 0 check (vertraging_dagen between 0 and 365),
  actief boolean not null default false,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now(),
  check (soort = 'campagne' or trigger is not null)
);
create trigger trg_nb_campagnes_bijgewerkt
  before update on public.nb_campagnes
  for each row execute function public.set_bijgewerkt_op();

-- Verzendingen (één per ontvanger per campagne) ----------------------------------
create table public.nb_verzendingen (
  id uuid primary key default gen_random_uuid(),
  campagne_id uuid not null references public.nb_campagnes(id) on delete cascade,
  contact_id uuid references public.nb_contacten(id) on delete set null,
  email text not null,
  status text not null default 'wachtrij'
    check (status in ('wachtrij', 'verwerken', 'verzonden', 'mislukt', 'overgeslagen')),
  fout text,
  resend_id text,
  geclaimd_op timestamptz,
  verzonden_op timestamptz,
  geopend_op timestamptz,
  aantal_geopend integer not null default 0,
  geklikt_op timestamptz,
  aantal_kliks integer not null default 0,
  afgemeld_op timestamptz,
  gebounced_op timestamptz,
  aangemaakt_op timestamptz not null default now(),
  unique (campagne_id, contact_id)
);
create index nb_verzendingen_wachtrij on public.nb_verzendingen (status, aangemaakt_op);
create index nb_verzendingen_campagne on public.nb_verzendingen (campagne_id);
create index nb_verzendingen_resend on public.nb_verzendingen (resend_id);

create table public.nb_klikken (
  id bigint generated always as identity primary key,
  verzending_id uuid not null references public.nb_verzendingen(id) on delete cascade,
  url text not null,
  op timestamptz not null default now()
);
create index nb_klikken_verzending on public.nb_klikken (verzending_id);

-- Bij verwijderen van een contact (recht op vergetelheid) het e-mailadres ook uit
-- de verzendgeschiedenis halen; de geanonimiseerde cijfers blijven bestaan.
create function public.nb_contact_vergeten() returns trigger language plpgsql as $$
begin
  update public.nb_verzendingen set email = 'verwijderd' where contact_id = old.id;
  return old;
end;
$$;
create trigger trg_nb_contact_vergeten
  before delete on public.nb_contacten
  for each row execute function public.nb_contact_vergeten();

-- Wachtrij: pak atomair de volgende verzendingen (ook vastgelopen na 30 minuten),
-- nooit van een gepauzeerde campagne.
create function public.nb_claim_verzendingen(p_max integer)
returns setof public.nb_verzendingen language sql as $$
  update public.nb_verzendingen v
     set status = 'verwerken', geclaimd_op = now()
   where v.id in (
     select w.id
       from public.nb_verzendingen w
       join public.nb_campagnes c on c.id = w.campagne_id
      where c.status <> 'gepauzeerd'
        and (w.status = 'wachtrij'
             or (w.status = 'verwerken' and w.geclaimd_op < now() - interval '30 minutes'))
      order by w.aangemaakt_op
      limit p_max
      for update of w skip locked)
  returning v.*;
$$;

create function public.nb_registreer_open(p_verzending uuid) returns void language sql as $$
  update public.nb_verzendingen
     set aantal_geopend = aantal_geopend + 1,
         geopend_op = coalesce(geopend_op, now())
   where id = p_verzending;
$$;

create function public.nb_registreer_klik(p_verzending uuid, p_url text) returns void language sql as $$
  insert into public.nb_klikken (verzending_id, url) values (p_verzending, left(p_url, 2000));
  update public.nb_verzendingen
     set aantal_kliks = aantal_kliks + 1,
         geklikt_op = coalesce(geklikt_op, now()),
         -- Een klik betekent ook dat de mail is geopend (pixels worden vaak geblokkeerd).
         geopend_op = coalesce(geopend_op, now())
   where id = p_verzending;
$$;

alter table public.nb_contacten enable row level security;
alter table public.nb_campagnes enable row level security;
alter table public.nb_verzendingen enable row level security;
alter table public.nb_klikken enable row level security;

revoke execute on function public.nb_claim_verzendingen(integer) from public, anon, authenticated;
revoke execute on function public.nb_registreer_open(uuid) from public, anon, authenticated;
revoke execute on function public.nb_registreer_klik(uuid, text) from public, anon, authenticated;

-- Openbare bucket voor afbeeldingen in nieuwsbrieven (mailprogramma's moeten ze
-- zonder inloggen kunnen laden).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('nieuwsbrief', 'nieuwsbrief', true, 5242880, array['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

-- Instellingen
insert into public.instellingen (sleutel, waarde, omschrijving) values
  ('nb_max_per_dag', '100', 'Maximaal aantal nieuwsbriefmails per dag (limiet van je Resend-abonnement).'),
  ('nb_meten', 'ja', 'Opens en kliks in nieuwsbrieven meten (ja/nee).')
on conflict (sleutel) do nothing;
