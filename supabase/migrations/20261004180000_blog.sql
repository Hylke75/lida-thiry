-- Blog: berichten (zelf geschreven of met AI als concept), afbeeldingen in een
-- openbare bucket en een logboek van AI-gebruik (tokens en kosten).

create table public.blog_berichten (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 100),
  titel text not null check (length(titel) between 1 and 200),
  samenvatting text not null default '',
  -- Tekst in de opmaak van src/lib/inhoud/opmaak.ts (## kop, - lijst, **vet**, [link](url), ![alt](https://…)).
  inhoud text not null default '',
  omslag_url text check (omslag_url is null or omslag_url ~ '^https://'),
  omslag_alt text not null default '',
  categorie text,
  tags text[] not null default '{}',
  status text not null default 'concept' check (status in ('concept', 'gepubliceerd')),
  -- Gepubliceerd en dit moment voorbij = zichtbaar; in de toekomst = ingepland.
  gepubliceerd_op timestamptz,
  seo_titel text not null default '',
  seo_omschrijving text not null default '',
  auteur text not null default 'Lida Thiry',
  uitgelicht boolean not null default false,
  ai_gegenereerd boolean not null default false,
  -- Wat er aan de AI is gevraagd (steekwoorden, toon, lengte, ...), voor naslag.
  ai_opdracht jsonb,
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now(),
  check (status = 'concept' or gepubliceerd_op is not null)
);
create index blog_berichten_publicatie on public.blog_berichten (status, gepubliceerd_op desc);
create index blog_berichten_tags on public.blog_berichten using gin (tags);
create trigger trg_blog_berichten_bijgewerkt
  before update on public.blog_berichten
  for each row execute function public.set_bijgewerkt_op();
alter table public.blog_berichten enable row level security;

create table public.blog_ai_gebruik (
  id bigint generated always as identity primary key,
  bericht_id uuid references public.blog_berichten(id) on delete set null,
  soort text not null,            -- 'schrijven' of een bewerking zoals 'korter'
  model text not null,
  invoer_tokens integer not null default 0,
  uitvoer_tokens integer not null default 0,
  kosten_dollarcent numeric(10, 2) not null default 0,
  op timestamptz not null default now()
);
create index blog_ai_gebruik_op on public.blog_ai_gebruik (op desc);
alter table public.blog_ai_gebruik enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog', 'blog', true, 5242880, array['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
on conflict (id) do nothing;
