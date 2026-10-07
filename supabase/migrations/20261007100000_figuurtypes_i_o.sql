-- Extra figuurtypes I (I-silhouet) en O (O-silhouet, de Appel), zoals op de oude
-- website. Ze komen NIET ACTIEF binnen: er is nog geen advies. De adviseur zet
-- ze actief als de 12 hand-outs per type klaar zijn. Idempotent.
--
-- Beschrijvingen naar Lida's eigen blogteksten:
--   /blog/i-silhouet-versus-h-silhouet-bodytypes, /blog/de-ideale-jurk-voor-het-i-silhouet,
--   /blog/miskopen-voor-het-i-silhouet, /blog/stijladvies-voor-het-o-silhouet-het-appelfiguur,
--   /blog/het-slanke-o-silhouet, /blog/jurk-voor-het-o-silhouet, /blog/miskopen-voor-het-o-silhouet.

-- 1. De twee lichaamstypes (niet actief) ---------------------------------------
insert into public.lichaamstypes (code, naam, alias, korte_omschrijving, uitleg, kenmerken, vorm, volgorde, actief) values
  ('I', 'I-silhouet', 'het I-silhouet',
   'Recht en smal: schouders en heupen bijna even breed, kleine bandmaat.',
   'Het I-silhouet heet ook wel het rechte bodytype, de kleerhanger of het potlood. Je schouders en heupen zijn in omvang bijna gelijk en je taille is niet veel smaller: de taille-omvang is meer dan 75% van je schouderomvang, met een rechte hoge heup. Daarin lijkt het I-silhouet op het H-silhouet; het verschil zit in de bandmaat van je bh. Bij een bandmaat van 70 of kleiner (elke cup) is het een I, vanaf 75 een H. Je figuur heeft geen ronde vormen, meestal een kleine cupmaat en een jeugdige uitstraling.',
   E'Schouders en heupen in omvang bijna gelijk\nTaille-omvang meer dan 75% van de schouderomvang\nRechte hoge heup\nBandmaat van de bh 70 of kleiner (elke cup)\nGeen ronde vormen\nMeestal een kleine cupmaat\nJeugdige uitstraling\nGeen buikje of brede heupen',
   '{"schouder": 32, "borst": 29, "taille": 26, "hogeHeup": 28, "heup": 30}', 6, false),
  ('O', 'O-silhouet', 'de Appel',
   'Meeste gewicht boven de taille, smalle heupen en slanke benen.',
   'Het O-silhouet heet ook wel het appelfiguur. Het meeste gewicht zit boven de taille. Je hebt een brede ribbenkast, gemiddelde tot brede, ronde schouders en een gemiddelde tot volle buste. Je balans ligt hoog: je borst is voller dan je heupen. Je bovenlichaam is kort en je heupen zijn recht en smal; taille, heupen en schouders zijn ongeveer even breed. Je hebt een plat achterwerk en lange, slanke benen. Kom je aan, dan gaat dat eerst naar je taille, buik en rug; je benen blijven slank.',
   E'Meeste gewicht boven de taille\nBrede ribbenkast\nGemiddelde tot brede, ronde schouders\nGemiddelde tot volle buste\nHoge balans: borst voller dan heupen\nKort bovenlichaam\nRechte, smalle heupen\nTaille, heupen en schouders ongeveer even breed\nPlat achterwerk\nLange, slanke benen\nAankomen gaat eerst naar taille, buik en rug',
   '{"schouder": 40, "borst": 42, "taille": 40, "hogeHeup": 37, "heup": 36}', 7, false)
on conflict (code) do nothing;

-- 2. De 12 adviestypes (hand-outs) per nieuw type -------------------------------
-- Zoals "Nieuw lichaamstype" in het beheer: één per categorie, titel
-- "<categorie> – <naam>", lengte- en maatlabel overgenomen van een bestaand
-- adviestype in dezelfde categorie. Nog zonder onderdelen (secties).
insert into public.adviestypes (sleutel, letter, categorie, titel, lengte_label, maat_label)
select c.nummer::text || t.code,
       t.code,
       c.nummer,
       c.titel || ' – ' || t.naam,
       (select a.lengte_label from public.adviestypes a
         where a.categorie = c.nummer and a.lengte_label is not null order by a.sleutel limit 1),
       (select a.maat_label from public.adviestypes a
         where a.categorie = c.nummer and a.maat_label is not null order by a.sleutel limit 1)
  from (values
          (1, 'Kort – tenger'), (2, 'Kort – gemiddeld'), (3, 'Kort – vol'), (4, 'Kort – plus'),
          (5, 'Gemiddeld – tenger'), (6, 'Gemiddeld – gemiddeld'), (7, 'Gemiddeld – vol'), (8, 'Gemiddeld – plus'),
          (9, 'Lang – tenger'), (10, 'Lang – gemiddeld'), (11, 'Lang – vol'), (12, 'Lang – plus')
       ) as c(nummer, titel)
 cross join public.lichaamstypes t
 where t.code in ('I', 'O')
on conflict (sleutel) do nothing;

-- 3. Bandmaat van de bh bij het testresultaat (optioneel) -----------------------
alter table public.testresultaten
  add column if not exists behamaat_band smallint check (behamaat_band between 60 and 120);
comment on column public.testresultaten.behamaat_band is
  'Bandmaat van de bh (bijv. 70 bij 70B). Optioneel; alleen gevraagd als extra_figuurtypes_berekening aan staat.';

-- 4. Schakelaar (standaard uit) -------------------------------------------------
insert into public.instellingen (sleutel, waarde, omschrijving) values
  ('extra_figuurtypes_berekening', 'uit',
   'Extra figuurtypes I en O in de berekening: aan of uit (standaard uit). VOORLOPIG.')
on conflict (sleutel) do nothing;

-- 5. De bandmaat hoort bij de lichaamsmaten: ook wissen na de bewaartermijn ------
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
