-- Tweestapsverificatie verplicht voor alle beheerders ('ja' of 'nee').
-- Bij 'ja' moeten beheerders zonder authenticator-app die eerst instellen op
-- /admin/beveiliging voordat ze iets anders in het beheer kunnen doen.
-- Wie al een app heeft gekoppeld, moet die bij het inloggen altijd gebruiken.
insert into public.instellingen (sleutel, waarde, omschrijving)
values (
  'mfa_verplicht',
  'nee',
  'Tweestapsverificatie (authenticator-app) verplicht voor alle beheerders: ja of nee.'
)
on conflict (sleutel) do nothing;
