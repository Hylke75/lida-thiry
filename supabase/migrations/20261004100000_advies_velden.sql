-- Vaste velden per adviestype (sjabloon), afgeleid van de opbouw van de
-- oorspronkelijke Word-documenten. Elk adviestype heeft per veld één sectie
-- (adviessecties.veld_sleutel); de volgorde in de PDF volgt het sjabloon.

create table public.advies_velden (
  sleutel text primary key,
  kop text not null,                    -- kop in de PDF
  volgorde integer not null unique,
  groep text not null,                  -- indeling in de editor
  hulptekst text,                       -- uitleg voor de adviseur in de editor
  bijgewerkt_op timestamptz not null default now()
);
alter table public.advies_velden enable row level security;

insert into public.advies_velden (sleutel, kop, volgorde, groep, hulptekst) values
  ('kenmerken',    'Je hebt',                 1, 'Je figuur',      'De kenmerken van dit figuur, als opsomming (regels beginnend met "- ").'),
  ('silhouet',     'Je silhouet',             2, 'Je figuur',      'De zin die het silhouet benoemt, bijv. "Je hebt het A-silhouet, ook wel de Driehoek of de Peer genoemd". Met de silhouettekening(en).'),
  ('kledingplan',  'Je kledingplan',          3, 'Je figuur',      'De kern van het advies: waar breng je de aandacht naartoe en hoe breng je het silhouet in balans.'),
  ('schouders',    'Je schouders',            4, 'Lichaamsdelen',  'Advies voor de schouderpartij.'),
  ('bovenlichaam', 'Je bovenlichaam',         5, 'Lichaamsdelen',  'Advies voor het bovenlichaam.'),
  ('taille',       'Je taille en middenrif',  6, 'Lichaamsdelen',  'Advies voor taille en middenrif.'),
  ('onderlichaam', 'Je onderlichaam',         7, 'Lichaamsdelen',  'Advies voor heupen, billen en benen.'),
  ('kleuren',      'Je kleuren en dessins',   8, 'Kleur en stof',  'Kleuren, dessins en stoffen; vaak als opsomming.'),
  ('sjaals',       'Je sjaals',               9, 'Accessoires',    'Hoe en welke sjaals.'),
  ('sieraden',     'Je sieraden',            10, 'Accessoires',    'Welke sieraden en hoe te dragen.'),
  ('riemen',       'Je riemen en ceintuurs', 11, 'Accessoires',    'Riemen en ceintuurs.'),
  ('schoenen',     'Je schoenen',            12, 'Accessoires',    'Schoenen en laarzen.'),
  ('tassen',       'Je tassen',              13, 'Accessoires',    'Tassen: model, formaat, materiaal.'),
  ('broeken',      'Je broeken',             14, 'Kledingstukken', 'Algemeen advies, daarna per model een alinea die begint met de modelnaam in vet, bijv. "**Bootcut**: ...".'),
  ('rokken',       'Je rokken',              15, 'Kledingstukken', 'Algemeen advies, daarna per model een alinea met de modelnaam in vet.'),
  ('tops',         'Je tops',                16, 'Kledingstukken', 'Algemeen advies, daarna per model een alinea met de modelnaam in vet.'),
  ('jasjes',       'Je jasjes en mantels',   17, 'Kledingstukken', 'Algemeen advies, daarna per model een alinea met de modelnaam in vet.'),
  ('jurken',       'Je jurken',              18, 'Kledingstukken', 'Algemeen advies, daarna per model een alinea met de modelnaam in vet.');

alter table public.adviessecties
  add column if not exists veld_sleutel text references public.advies_velden(sleutel);
create unique index if not exists adviessecties_type_veld_uniek
  on public.adviessecties (type_sleutel, veld_sleutel) where veld_sleutel is not null;
