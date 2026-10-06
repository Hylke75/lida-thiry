-- Lichaamstypes (figuurtypes) beheerbaar in de admin in plaats van vast in de code.
-- code = het deel van de adviestype-sleutel na de categorie (bijv. 6A -> A).
-- Nieuwe codes: 1-3 hoofdletters (de bestaande '8' blijft geldig).

create table public.lichaamstypes (
  code text primary key check (code ~ '^([A-Z]{1,3}|8)$'),
  naam text not null,                         -- bijv. Zandloper
  alias text,                                 -- bijv. de Driehoek of de Peer
  korte_omschrijving text not null default '',-- bij de silhouetkeuze in de test
  uitleg text not null default '',            -- bij de uitslag en op het PDF-voorblad
  kenmerken text not null default '',         -- opsomming (regels met "- ")
  vorm jsonb not null,                        -- verhoudingen voor de tekening
  beeld_id uuid references public.beelden(id) on delete set null, -- optionele foto/illustratie
  volgorde integer not null default 0,
  actief boolean not null default true,       -- niet actief = niet kiesbaar in de test
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);
create trigger trg_lichaamstypes_bijgewerkt
  before update on public.lichaamstypes
  for each row execute function public.set_bijgewerkt_op();
alter table public.lichaamstypes enable row level security;

insert into public.lichaamstypes (code, naam, alias, korte_omschrijving, uitleg, vorm, volgorde) values
  ('X', 'Zandloper', 'de Zandloper', 'Schouders en heupen in balans, duidelijke taille.',
   'Je schouders en heupen zijn mooi met elkaar in balans en je taille is duidelijk smaller. Kleding die je taille volgt of accentueert, zoals een wikkeljurk, een getailleerd jasje of een riem, laat die natuurlijke rondingen het best tot hun recht komen. Te wijde, rechte modellen verbergen juist wat zo mooi is aan jouw figuur.',
   '{"schouder": 40, "borst": 38, "taille": 20, "hogeHeup": 30, "heup": 40}', 1),
  ('A', 'Peer / driehoek', 'de Driehoek of de Peer', 'Heupen breder dan schouders.',
   'Je heupen zijn breder dan je schouders en je bovenlichaam is relatief tenger. Met wat meer aandacht boven, zoals een mooie halslijn, details op de schouders of een lichte kleur in je top, breng je boven en onder in balans. Rokken en broeken die soepel over je heupen vallen maken het geheel af.',
   '{"schouder": 28, "borst": 28, "taille": 23, "hogeHeup": 34, "heup": 46}', 2),
  ('V', 'Omgekeerde driehoek', 'de Omgekeerde driehoek', 'Schouders breder dan heupen.',
   'Je schouders en borst zijn breder dan je heupen, wat je een krachtig, sportief bovenlichaam geeft. Rustige bovenstukken met bijvoorbeeld een V-hals houden je bovenlijf in balans, terwijl wat meer volume of detail onder, zoals een A-lijnrok of een wijdere broek, je heupen mooi aanvult.',
   '{"schouder": 48, "borst": 42, "taille": 28, "hogeHeup": 28, "heup": 29}', 3),
  ('H', 'Rechthoek', 'de Rechthoek', 'Weinig verschil tussen borst, taille en heup.',
   'Je borst, taille en heupen liggen dicht bij elkaar, waardoor je figuur slank en recht oogt. Strakke, grafische lijnen staan je goed, en met kleding die een taille suggereert, zoals een ceintuur, een peplum of een getailleerd jasje, breng je extra vorm in je silhouet.',
   '{"schouder": 34, "borst": 33, "taille": 32, "hogeHeup": 33, "heup": 34}', 4),
  ('8', 'De 8', 'de Acht', 'Voller silhouet met balans boven en onder.',
   'Je hebt een vol, vrouwelijk figuur met rondingen boven én onder en een duidelijke taille. Kleding die je lijnen volgt zonder te knellen, in soepel vallende stoffen en met de nadruk op je taille, staat je het mooist. Zo blijft de balans van je figuur zichtbaar en voel je je comfortabel.',
   '{"schouder": 42, "borst": 44, "taille": 31, "hogeHeup": 43, "heup": 47}', 5);

-- Welke uitkomst van de berekening (FFIT-type) bij welk lichaamstype hoort.
create table public.ffit_toewijzing (
  ffit_type text primary key check (ffit_type in (
    'Zandloper', 'Onderste zandloper', 'Bovenste zandloper', 'Lepel',
    'Driehoek / peer', 'Omgekeerde driehoek', 'Rechthoek')),
  code text not null references public.lichaamstypes(code) on delete restrict,
  bijgewerkt_op timestamptz not null default now()
);
alter table public.ffit_toewijzing enable row level security;
insert into public.ffit_toewijzing (ffit_type, code) values
  ('Zandloper', 'X'), ('Onderste zandloper', '8'), ('Bovenste zandloper', '8'), ('Lepel', 'A'),
  ('Driehoek / peer', 'A'), ('Omgekeerde driehoek', 'V'), ('Rechthoek', 'H');

-- Adviestypes en beelden verwijzen naar het lichaamstype.
alter table public.adviestypes
  add constraint adviestypes_letter_fk foreign key (letter) references public.lichaamstypes(code) on delete restrict;
alter table public.beelden drop constraint if exists beelden_figuur_check;
alter table public.beelden
  add constraint beelden_figuur_fk foreign key (figuur) references public.lichaamstypes(code) on delete set null;
