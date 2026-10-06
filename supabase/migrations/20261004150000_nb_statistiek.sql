-- Nieuwsbrief: cijfers per campagne en per link, in de database geteld zodat het
-- beheer niet alle verzendingen hoeft op te halen. De app valt terug op zelf
-- tellen als deze functies (nog) niet bestaan. Alleen voor de service-role.

create or replace function public.nb_campagne_statistiek(p_ids uuid[])
returns table (
  campagne_id uuid,
  totaal bigint,
  wachtrij bigint,
  verzonden bigint,
  mislukt bigint,
  overgeslagen bigint,
  geopend bigint,
  geklikt bigint,
  afgemeld bigint,
  gebounced bigint
)
language sql stable as $$
  select v.campagne_id,
         count(*),
         count(*) filter (where v.status in ('wachtrij', 'verwerken')),
         count(*) filter (where v.status = 'verzonden'),
         count(*) filter (where v.status = 'mislukt'),
         count(*) filter (where v.status = 'overgeslagen'),
         count(*) filter (where v.geopend_op is not null),
         count(*) filter (where v.geklikt_op is not null),
         count(*) filter (where v.afgemeld_op is not null),
         count(*) filter (where v.gebounced_op is not null)
    from public.nb_verzendingen v
   where v.campagne_id = any(p_ids)
   group by v.campagne_id;
$$;

create or replace function public.nb_klik_statistiek(p_campagne uuid)
returns table (url text, uniek bigint, totaal bigint)
language sql stable as $$
  select k.url, count(distinct k.verzending_id), count(*)
    from public.nb_klikken k
    join public.nb_verzendingen v on v.id = k.verzending_id
   where v.campagne_id = p_campagne
   group by k.url
   order by 2 desc, 3 desc, 1
   limit 500;
$$;

revoke execute on function public.nb_campagne_statistiek(uuid[]) from public, anon, authenticated;
revoke execute on function public.nb_klik_statistiek(uuid) from public, anon, authenticated;
