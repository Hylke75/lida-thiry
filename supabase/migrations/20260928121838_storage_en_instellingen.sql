-- Privé Storage-bucket voor de gegenereerde advies-PDF's. Toegang alleen via
-- tijdelijke signed URL's (server-side, service-role). Geen publieke policies.
insert into storage.buckets (id, name, public)
values ('adviezen-pdf', 'adviezen-pdf', false)
on conflict (id) do nothing;

-- Standaard operationele instellingen. OPEN-waarden staan leeg en worden door de
-- adviseur ingevuld (prijs, doorlooptijd).
insert into public.instellingen (sleutel, waarde, omschrijving) values
  ('prijs_cent', null, 'Prijs van de zelftest in centen (OPEN).'),
  ('valuta', 'EUR', 'Valuta van de prijs.'),
  ('token_geldigheid_dagen', '30', 'Geldigheidsduur van de testlink in dagen.'),
  ('bewaartermijn_maten_dagen', '30', 'Na hoeveel dagen lichaamsmaten worden verwijderd/geanonimiseerd.'),
  ('doorlooptijd_werkdagen', null, 'Doorlooptijd bij handmatige beoordeling in werkdagen (OPEN).'),
  ('zandloper_variant', 'ffit', 'Welke zandloper-regel leidend is: ffit of excel.')
on conflict (sleutel) do nothing;
