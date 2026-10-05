-- Functies afschermen (uit de Supabase-beveiligingsadviezen). Idempotent.
--
-- 1. anonimiseer_oude_maten is security definer en was door anon/authenticated via
--    /rest/v1/rpc aan te roepen: met dagen = 0 kon iedereen alle lichaamsmaten wissen.
--    Alleen de server (service_role, de nachtelijke cron) mag hem aanroepen.
revoke execute on function public.anonimiseer_oude_maten(integer) from public, anon, authenticated;
grant execute on function public.anonimiseer_oude_maten(integer) to service_role;

-- 2. Vaste search_path voor functies die die nog niet hadden.
alter function public.nb_contact_vergeten() set search_path = public;
alter function public.nb_zet_actief_sinds() set search_path = public;
alter function public.nb_registreer_open(uuid) set search_path = public;
alter function public.nb_registreer_klik(uuid, text) set search_path = public;
alter function public.nb_campagne_statistiek(uuid[]) set search_path = public;
alter function public.nb_klik_statistiek(uuid) set search_path = public;
alter function public.tel_doorverwijzing(text) set search_path = public;
alter function public.registreer_fout(text, text, text, text, text, text, jsonb) set search_path = public;
do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'nb_claim_verzendingen_oud'
  ) then
    alter function public.nb_claim_verzendingen_oud(integer) set search_path = public;
  end if;
end;
$$;
