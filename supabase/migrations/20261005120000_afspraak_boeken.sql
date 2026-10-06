-- Afspraak boeken zonder dubbele boekingen.
--
-- Twee bezoekers die tegelijk dezelfde tijd kiezen, mogen niet allebei een
-- afspraak krijgen. Een exclusion constraint past hier niet goed: een afspraak
-- in 'wacht_op_betaling' houdt de tijd maar 30 minuten vast, en de buffer na een
-- afspraak hangt af van de soort. Daarom één functie die (binnen één transactie,
-- achter een advisory lock) controleert of de tijd nog vrij is en dan pas invoegt.
-- Geeft de nieuwe rij terug, of niets als de tijd inmiddels bezet is.
--
-- De app valt terug op controleren-invoegen-nacontroleren zolang deze migratie
-- nog niet is toegepast.

create or replace function public.boek_afspraak(
  p_soort_id uuid,
  p_relatie_id uuid,
  p_naam text,
  p_email text,
  p_telefoon text,
  p_opmerking text,
  p_start timestamptz,
  p_eind timestamptz,
  p_status text,
  p_aanbetaling_cent integer,
  p_buffer_minuten integer,
  p_betaaltermijn_minuten integer default 30
)
returns setof public.afspraken
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Alle boekingen na elkaar (kort: alleen deze controle en de insert).
  perform pg_advisory_xact_lock(hashtext('public.afspraken.boeken'));

  if exists (
    select 1
      from public.afspraken a
      left join public.afspraak_soorten s on s.id = a.soort_id
     where a.status <> 'geannuleerd'
       and (a.status <> 'wacht_op_betaling'
            or a.aangemaakt_op > now() - make_interval(mins => p_betaaltermijn_minuten))
       and a.start_op < p_eind + make_interval(mins => p_buffer_minuten)
       and p_start < a.eind_op + make_interval(mins => coalesce(s.buffer_minuten, p_buffer_minuten))
  ) then
    return;
  end if;

  if exists (
    select 1 from public.afspraak_blokkades b where b.van < p_eind and p_start < b.tot
  ) then
    return;
  end if;

  return query
    insert into public.afspraken
      (soort_id, relatie_id, naam, email, telefoon, opmerking, start_op, eind_op, status, aanbetaling_cent)
    values
      (p_soort_id, p_relatie_id, p_naam, lower(p_email), p_telefoon, p_opmerking, p_start, p_eind, p_status, p_aanbetaling_cent)
    returning *;
end;
$$;

revoke execute on function public.boek_afspraak(uuid, uuid, text, text, text, text, timestamptz, timestamptz, text, integer, integer, integer)
  from public, anon, authenticated;
