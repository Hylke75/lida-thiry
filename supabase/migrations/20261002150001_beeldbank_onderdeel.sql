-- Onderdeelnamen in de beeldbank als slug (gelijk aan ONDERDELEN in de code).
update public.beelden set onderdeel = replace(onderdeel, ' ', '-') where onderdeel like '% %';
