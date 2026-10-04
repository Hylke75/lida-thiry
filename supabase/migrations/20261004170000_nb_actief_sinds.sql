-- Automatische mails: onthoud sinds wanneer een automatisering aanstaat. Alleen
-- contacten waarvan het startmoment (aanmelding of advies) daarna valt, krijgen de
-- mail. Bewerken van een actieve automatisering verandert dit moment niet.

alter table public.nb_campagnes add column actief_sinds timestamptz;
update public.nb_campagnes set actief_sinds = bijgewerkt_op where actief;

create function public.nb_zet_actief_sinds() returns trigger language plpgsql as $$
begin
  if new.actief and (tg_op = 'INSERT' or not old.actief) then
    new.actief_sinds := now();
  elsif not new.actief then
    new.actief_sinds := null;
  end if;
  return new;
end;
$$;
create trigger trg_nb_actief_sinds
  before insert or update of actief on public.nb_campagnes
  for each row execute function public.nb_zet_actief_sinds();
