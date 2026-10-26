-- Rekenmethode van Lida Thiry (antwoorden 26-10-2026), naast de FFIT-methode.
-- Standaard blijft FFIT aan; Lida zet haar methode aan in Beheer → Rekentool
-- nadat ze die met de proefberekening heeft getoetst. Idempotent.

-- 1. Extra gegevens bij het testresultaat (alleen gevraagd bij Lida's methode).
alter table public.testresultaten
  add column if not exists schouderbreedte smallint check (schouderbreedte between 25 and 60),
  add column if not exists breedste_punt text check (breedste_punt in ('schouders', 'gelijk', 'heupen')),
  add column if not exists bovenlichaam text check (bovenlichaam in ('kort', 'gemiddeld', 'lang')),
  add column if not exists rekenmodel text not null default 'ffit' check (rekenmodel in ('ffit', 'lida'));
comment on column public.testresultaten.schouderbreedte is
  'Schouderbreedte in cm, op de rug van schouderpunt tot schouderpunt (Lida''s methode).';
comment on column public.testresultaten.breedste_punt is
  'Breedste punt in de spiegel: schouders, gelijk of heupen (Lida''s methode).';
comment on column public.testresultaten.bovenlichaam is
  'Lengte van het bovenlichaam uit de handentest: kort, gemiddeld of lang (Lida''s methode).';
comment on column public.testresultaten.rekenmodel is
  'Rekenmethode waarmee het silhouet is bepaald: ffit of lida.';

-- 2. Instellingen (standaard de FFIT-methode, grenzen leeg = standaardgrenzen).
insert into public.instellingen (sleutel, waarde, omschrijving) values
  ('rekenmodel', 'ffit', 'Rekenmethode van de test: ffit (standaard) of lida.'),
  ('rekenmodel_lida_grenzen', '', 'Grenzen van Lida''s rekenmethode (JSON); leeg = standaard.')
on conflict (sleutel) do nothing;

-- 3. De nieuwe lichaamsgegevens horen bij de maten: ook wissen na de bewaartermijn.
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
         behamaat_band = null,
         schouderbreedte = null,
         breedste_punt = null,
         bovenlichaam = null,
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

revoke execute on function public.anonimiseer_oude_maten(integer) from public, anon, authenticated;
grant execute on function public.anonimiseer_oude_maten(integer) to service_role;

-- 4. Koppeling volgens Lida: de Lepel is het 8-silhouet; boven- en onderste
--    zandloper zijn de Zandloper (X). (Live al op 26-10-2026 aangepast.)
update public.ffit_toewijzing set code = '8', bijgewerkt_op = now() where ffit_type = 'Lepel' and code <> '8';
update public.ffit_toewijzing set code = 'X', bijgewerkt_op = now()
 where ffit_type in ('Onderste zandloper', 'Bovenste zandloper') and code <> 'X';
