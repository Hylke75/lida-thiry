-- E-mailadres van de adviseur voor twijfelgeval-meldingen (OPEN: nog in te vullen).
insert into public.instellingen (sleutel, waarde, omschrijving)
values ('adviseur_email', null, 'E-mailadres van de adviseur voor meldingen bij handmatige beoordeling (OPEN).')
on conflict (sleutel) do nothing;
