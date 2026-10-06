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

-- Wachtrij: automatische mails (zoals de welkomstmail) gaan vóór een grote
-- campagne, zodat ze niet uren of dagen achter de daglimiet blijven hangen.
create or replace function public.nb_claim_verzendingen(p_max integer)
returns setof public.nb_verzendingen language sql as $$
  update public.nb_verzendingen v
     set status = 'verwerken', geclaimd_op = now()
   where v.id in (
     select w.id
       from public.nb_verzendingen w
       join public.nb_campagnes c on c.id = w.campagne_id
      where c.status <> 'gepauzeerd'
        and (w.status = 'wachtrij'
             or (w.status = 'verwerken' and w.geclaimd_op < now() - interval '30 minutes'))
      order by (c.soort = 'automatisch') desc, w.aangemaakt_op
      limit p_max
      for update of w skip locked)
  returning v.*;
$$;
revoke execute on function public.nb_claim_verzendingen(integer) from public, anon, authenticated;
