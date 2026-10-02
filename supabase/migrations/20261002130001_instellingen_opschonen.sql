-- Handmatige beoordeling bestaat niet meer: elke test krijgt automatisch een type.
-- De instelling voor de doorlooptijd daarvan is daarmee overbodig.
delete from public.instellingen where sleutel = 'doorlooptijd_werkdagen';

-- adviseur_email wordt nu gebruikt voor foutmeldingen (bijv. mislukte PDF of mail).
update public.instellingen
set omschrijving = 'E-mailadres waarop meldingen over fouten binnenkomen (bijv. een mislukte PDF of e-mail).'
where sleutel = 'adviseur_email';
