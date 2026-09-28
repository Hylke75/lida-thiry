-- Anonimiseert lichaamsmaten van afgeronde tests ouder dan N dagen. De order en
-- het toegekende type blijven bewaard voor de administratie; alleen persoonlijke
-- maten en antwoorden worden gewist. Retourneert het aantal geraakte rijen.
create or replace function public.anonimiseer_oude_maten(dagen integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  aantal integer;
begin
  update public.testresultaten r
     set lengte_cm = null,
         gewicht_kg = null,
         borst = null,
         taille = null,
         hoge_heup = null,
         heup = null,
         binnenbeen = null,
         schouder = null,
         controlemetingen = '{}'::jsonb,
         pasvormantwoorden = '{}'::jsonb
    from public.orders o
   where r.order_id = o.id
     and o.afgerond_op is not null
     and o.afgerond_op < (now() - make_interval(days => dagen))
     and r.lengte_cm is not null;
  get diagnostics aantal = row_count;
  return aantal;
end;
$$;

revoke all on function public.anonimiseer_oude_maten(integer) from anon, authenticated;
