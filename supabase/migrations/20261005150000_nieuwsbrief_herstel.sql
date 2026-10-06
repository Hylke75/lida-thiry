-- Nieuwsbrief: herstelpunten uit de review. Idempotent (veilig om opnieuw te draaien).
--
-- 1. nb_campagnes.wachtrij_gevuld_op: een campagne wordt pas afgerond als de hele
--    doelgroep in de wachtrij stond (niet al tijdens het vullen).
-- 2. nb_claim_verzendingen: bewaakt zelf de daglimiet (per Nederlandse kalenderdag,
--    onder een advisory lock, inclusief mails die nu verstuurd worden), claimt alleen
--    voor campagnes die bezig zijn of actieve automatische mails, en claimt
--    vastgelopen verzendingen ('verwerken' > 30 min) niet opnieuw maar zet ze op
--    'mislukt' met de notitie "mogelijk verzonden" (geen dubbele mails).
-- 3. nb_markeer_verzonden: een hele batch in één statement als verzonden markeren.
-- 4. nb_automatisering_kandidaten: wie een automatische mail nog niet kreeg
--    (anti-join), zonder vast te lopen na de eerste 1000; geïmporteerde contacten
--    krijgen geen welkomstmail.

-- 1. Wachtrij volledig gevuld ---------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'nb_campagnes' and column_name = 'wachtrij_gevuld_op'
  ) then
    alter table public.nb_campagnes add column wachtrij_gevuld_op timestamptz;
    -- Bestaande gestarte campagnes hadden hun wachtrij al gevuld.
    update public.nb_campagnes
       set wachtrij_gevuld_op = coalesce(gestart_op, now())
     where status in ('bezig', 'verzonden', 'gepauzeerd');
  end if;
end;
$$;

-- 2. Wachtrij claimen -------------------------------------------------------------------
-- De oude versie had één parameter; de nieuwe heeft standaardwaarden, dus een aanroep
-- met alleen p_max blijft werken (dan zonder daglimiet in de database). De oude
-- versie krijgt een andere naam (zonder rechten), zodat de aanroep niet dubbelzinnig is.
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'nb_claim_verzendingen'
       and pg_get_function_identity_arguments(p.oid) = 'p_max integer'
  ) then
    alter function public.nb_claim_verzendingen(integer) rename to nb_claim_verzendingen_oud;
    revoke all on function public.nb_claim_verzendingen_oud(integer) from public, anon, authenticated, service_role;
  end if;
end;
$$;

create or replace function public.nb_claim_verzendingen(
  p_max integer,
  p_dag_limiet integer default null,
  p_dag_start timestamptz default null
)
returns setof public.nb_verzendingen
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ruimte integer := p_max;
  v_gebruikt integer;
begin
  -- Eén claim tegelijk: zo tellen gelijktijdige rondes elkaars claims mee.
  perform pg_advisory_xact_lock(hashtext('nb_claim_verzendingen'));

  -- Vastgelopen verzendingen niet opnieuw versturen: Resend kan ze al hebben
  -- verstuurd. De beheerder kan ze bij de campagne bewust opnieuw proberen.
  update public.nb_verzendingen
     set status = 'mislukt',
         fout = 'Mogelijk verzonden: het verzenden werd onderbroken voordat de uitkomst was opgeslagen. Controleer dit in Resend voordat je opnieuw probeert.'
   where status = 'verwerken'
     and geclaimd_op < now() - interval '30 minutes';

  if p_dag_limiet is not null then
    select count(*)::integer into v_gebruikt
      from public.nb_verzendingen
     where status = 'verwerken'
        or (status = 'verzonden' and verzonden_op >= coalesce(p_dag_start, now() - interval '1 day'));
    v_ruimte := least(p_max, p_dag_limiet - v_gebruikt);
  end if;
  if v_ruimte is null or v_ruimte <= 0 then
    return;
  end if;

  -- Automatische mails (zoals de welkomstmail) gaan vóór een grote campagne.
  return query
  with geclaimd as (
    update public.nb_verzendingen v
       set status = 'verwerken', geclaimd_op = now()
     where v.id in (
       select w.id
         from public.nb_verzendingen w
         join public.nb_campagnes c on c.id = w.campagne_id
        where w.status = 'wachtrij'
          and ((c.soort = 'campagne' and c.status = 'bezig')
               or (c.soort = 'automatisch' and c.actief and c.status <> 'gepauzeerd'))
        order by (c.soort = 'automatisch') desc, w.aangemaakt_op
        limit v_ruimte
        for update of w skip locked)
    returning v.*
  )
  select * from geclaimd;
end;
$$;
revoke execute on function public.nb_claim_verzendingen(integer, integer, timestamptz) from public, anon, authenticated;

-- 3. Batch als verzonden markeren ---------------------------------------------------------
create or replace function public.nb_markeer_verzonden(p_ids uuid[], p_resend_ids text[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_aantal integer;
begin
  update public.nb_verzendingen v
     set status = 'verzonden', verzonden_op = now(), resend_id = r.resend_id, fout = null
    from unnest(p_ids, p_resend_ids) as r(id, resend_id)
   where v.id = r.id;
  get diagnostics v_aantal = row_count;
  return v_aantal;
end;
$$;
revoke execute on function public.nb_markeer_verzonden(uuid[], text[]) from public, anon, authenticated;

-- 4. Kandidaten voor een automatische mail -----------------------------------------------
create or replace function public.nb_automatisering_kandidaten(
  p_campagne uuid,
  p_vanaf timestamptz,
  p_grens timestamptz,
  p_max integer
)
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select k.id, k.email
    from public.nb_campagnes a
    join public.nb_contacten k on k.status = 'aangemeld'
   where a.id = p_campagne
     and a.soort = 'automatisch'
     and (
       -- Welkomstmail: na de aanmelding; niet voor geïmporteerde contacten.
       (a.trigger = 'aanmelding'
         and k.bron <> 'import'
         and k.bevestigd_op >= p_vanaf
         and k.bevestigd_op <= p_grens)
       or
       -- Na het advies: contacten met een afgerond advies in het venster.
       (a.trigger = 'advies'
         and exists (
           select 1
             from public.orders o
            where lower(trim(o.email)) = k.email
              and o.status = 'advies_verzonden'
              and o.afgerond_op >= p_vanaf
              and o.afgerond_op <= p_grens))
     )
     and not exists (
       select 1 from public.nb_verzendingen v where v.campagne_id = a.id and v.contact_id = k.id)
   order by k.bevestigd_op nulls last, k.id
   limit greatest(p_max, 0);
$$;
revoke execute on function public.nb_automatisering_kandidaten(uuid, timestamptz, timestamptz, integer) from public, anon, authenticated;

-- Uitleg bij de daglimiet: Resend telt álle mails, ook die bij bestellingen.
update public.instellingen
   set omschrijving = 'Maximaal aantal nieuwsbriefmails per dag. Resend telt ook de mails bij bestellingen, afspraken en contact mee: houd zo''n 30% van je Resend-limiet vrij.'
 where sleutel = 'nb_max_per_dag';
