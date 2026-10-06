-- Website, SEO, merk en voettekst beheerbaar (Beheer → Website → Instellingen en → SEO).
-- Alleen nieuwe sleutels in instellingen; leeg (null) = de standaard uit de code,
-- dus zonder deze rijen werkt de site precies zoals ervoor. Idempotent: bestaande
-- rijen (en waarden) blijven staan.

insert into public.instellingen (sleutel, waarde, omschrijving) values
  ('home_titel', null, 'Titel van de homepage in het tabblad en in Google (zonder sitenaam).'),
  ('deel_titel', null, 'Titel bij delen van de homepage en kop op de standaard-deelafbeelding.'),
  ('niet_indexeren', null, '"ja" = hele site uit zoekmachines (robots.txt blokkeert alles, noindex, lege sitemap). Vóór de livegang.'),
  ('bedrijf_type', null, 'Soort bedrijf voor zoekmachines (schema.org-type); leeg = ProfessionalService.'),
  ('telefoon', null, 'Telefoonnummer: voettekst, voorwaarden/privacy en gegevens voor zoekmachines.'),
  ('werkgebied', null, 'Werkgebied (plaatsen of regio''s, komma''s ertussen) voor zoekmachines; leeg = Nederland.'),
  ('eigenaar_naam', null, 'Naam van de eigenaar in de bedrijfsgegevens van voorwaarden en privacy.'),
  ('standaard_auteur', null, 'Auteur van blogberichten zonder eigen auteur; leeg = de eigenaar.'),
  ('afzender_naam', null, 'Naam van de afzender van e-mails (het adres komt uit RESEND_VAN).'),
  ('footer_beheerlink', null, '"verbergen" = geen link Beheer in de voettekst.'),
  ('seo_paginas', null, 'SEO van de vaste pagina''s (JSON: titel, omschrijving, niet indexeren, sitemap).')
on conflict (sleutel) do nothing;
