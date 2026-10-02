-- Kortingscodes en cadeaubonnen. Codes worden genormaliseerd (hoofdletters, zonder
-- spaties) opgeslagen; uniek ongeacht hoofd-/kleine letters.
-- soort 'percentage': waarde = hele procenten (1-100).
-- soort 'bedrag': waarde = korting in centen.
create table public.kortingscodes (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code = upper(btrim(code)) and length(code) between 3 and 40),
  omschrijving text,
  soort text not null check (soort in ('percentage', 'bedrag')),
  waarde integer not null check (waarde > 0),
  geldig_tot timestamptz,
  max_gebruik integer check (max_gebruik is null or max_gebruik > 0),
  aantal_gebruikt integer not null default 0 check (aantal_gebruikt >= 0),
  actief boolean not null default true,
  aangemaakt_op timestamptz not null default now(),
  constraint kortingscodes_percentage_max check (soort <> 'percentage' or waarde <= 100)
);

create unique index kortingscodes_code_uniek on public.kortingscodes (upper(code));

alter table public.kortingscodes enable row level security;
-- Geen policies: alleen de service-role (server-side) heeft toegang.

-- Korting op de bestelling. bedrag_cent blijft het uiteindelijk te betalen bedrag.
alter table public.orders
  add column if not exists kortingscode text,
  add column if not exists korting_cent integer not null default 0;

-- Verhoogt het gebruik van een kortingscode atomair. Met p_afdwingen = true
-- slaagt de verhoging alleen als de code actief, geldig en niet opgebruikt is
-- (claimen bij een gratis bestelling). Zonder afdwingen telt het gebruik altijd
-- mee (de klant heeft dan al betaald). Retourneert true als er een rij is bijgewerkt.
create or replace function public.gebruik_kortingscode(p_code text, p_afdwingen boolean default false)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  aantal integer;
begin
  update public.kortingscodes k
     set aantal_gebruikt = k.aantal_gebruikt + 1
   where upper(k.code) = upper(btrim(p_code))
     and (
       not p_afdwingen
       or (
         k.actief
         and (k.geldig_tot is null or k.geldig_tot > now())
         and (k.max_gebruik is null or k.aantal_gebruikt < k.max_gebruik)
       )
     );
  get diagnostics aantal = row_count;
  return aantal > 0;
end;
$$;

-- Geeft een eerder geclaimd gebruik weer vrij (bijv. als de bestelling daarna
-- niet aangemaakt kon worden).
create or replace function public.geef_kortingscode_vrij(p_code text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.kortingscodes k
     set aantal_gebruikt = greatest(k.aantal_gebruikt - 1, 0)
   where upper(k.code) = upper(btrim(p_code));
end;
$$;

revoke all on function public.gebruik_kortingscode(text, boolean) from public, anon, authenticated;
revoke all on function public.geef_kortingscode_vrij(text) from public, anon, authenticated;
