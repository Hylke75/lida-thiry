-- Rate limiting die over serverless-instanties heen werkt (geheugen wordt niet
-- gedeeld). Eén rij per (sleutel, venster); de sleutel bevat al een SHA-256-hash
-- van het IP-adres, nooit het IP zelf.
create table if not exists public.rate_limits (
  sleutel text not null,
  venster_start timestamptz not null,
  aantal integer not null default 0,
  primary key (sleutel, venster_start)
);

create index if not exists rate_limits_venster_start_idx
  on public.rate_limits (venster_start);

-- Alleen de service-role (adminClient) komt hierbij; geen policies = geen toegang
-- voor anon/authenticated.
alter table public.rate_limits enable row level security;
revoke all on table public.rate_limits from anon, authenticated;

-- Verwijdert vensters die ouder zijn dan een dag. Kan los vanuit een cron
-- worden aangeroepen (adminClient().rpc('opschonen_rate_limits')); daarnaast
-- ruimt rate_limit_hit zelf af en toe op.
create or replace function public.opschonen_rate_limits()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  aantal integer;
begin
  delete from public.rate_limits
   where venster_start < now() - interval '1 day';
  get diagnostics aantal = row_count;
  return aantal;
end;
$$;

-- Telt één hit voor p_sleutel in het huidige vaste venster van
-- p_venster_seconden en geeft true terug zolang het aantal <= p_max is
-- (true = toegestaan). Atomair dankzij insert ... on conflict do update.
create or replace function public.rate_limit_hit(
  p_sleutel text,
  p_venster_seconden integer,
  p_max integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_start timestamptz;
  v_aantal integer;
begin
  if p_venster_seconden is null or p_venster_seconden <= 0 then
    raise exception 'p_venster_seconden moet positief zijn';
  end if;

  v_start := to_timestamp(
    floor(extract(epoch from now()) / p_venster_seconden) * p_venster_seconden
  );

  insert into public.rate_limits as r (sleutel, venster_start, aantal)
  values (p_sleutel, v_start, 1)
  on conflict (sleutel, venster_start)
  do update set aantal = r.aantal + 1
  returning r.aantal into v_aantal;

  -- Af en toe (±1% van de aanroepen) oude vensters opruimen.
  if random() < 0.01 then
    perform public.opschonen_rate_limits();
  end if;

  return v_aantal <= p_max;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.opschonen_rate_limits() from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;
grant execute on function public.opschonen_rate_limits() to service_role;
