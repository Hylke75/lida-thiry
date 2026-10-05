-- Prullenbak: verwijderde pagina's en blogberichten rechtstreeks in de database
-- bepalen. Eerder las de app de nieuwste 5000 versies en zocht daarin; oudere
-- verwijderingen vielen dan uit de prullenbak zodra er genoeg nieuwe versies waren.
--
-- Per onderdeel (soort + ref) de nieuwste versie en het aantal versies, alleen voor
-- onderdelen die niet meer bestaan, nieuwste verwijdering eerst.

create or replace function public.prullenbak_items(p_limiet integer default 500)
returns table (
  versie_id uuid,
  soort text,
  ref text,
  op timestamptz,
  gemaakt_door text,
  titel text,
  slug text,
  aantal_versies integer
)
language sql
stable
set search_path = public
as $$
  with laatste as (
    select distinct on (v.soort, v.ref)
      v.id, v.soort, v.ref, v.op, v.gemaakt_door, v.inhoud ->> 'titel' as titel, v.inhoud ->> 'slug' as slug
    from public.versies v
    where v.soort in ('pagina', 'blog')
    order by v.soort, v.ref, v.op desc
  ),
  weg as (
    select l.*
    from laatste l
    where not exists (select 1 from public.paginas p where l.soort = 'pagina' and p.id::text = l.ref)
      and not exists (select 1 from public.blog_berichten b where l.soort = 'blog' and b.id::text = l.ref)
  )
  select w.id, w.soort, w.ref, w.op, w.gemaakt_door, w.titel, w.slug,
    (select count(*)::integer from public.versies v where v.soort = w.soort and v.ref = w.ref)
  from weg w
  order by w.op desc
  limit greatest(1, least(coalesce(p_limiet, 500), 2000));
$$;

revoke all on function public.prullenbak_items(integer) from public, anon, authenticated;
grant execute on function public.prullenbak_items(integer) to service_role;
