-- Vinkje "nieuwsbrief ontvangen" bij het bestellen. De klant wordt pas aangemeld
-- zodra de bestelling betaald is (zie src/lib/bestelling-betaald.ts).
alter table public.orders
  add column if not exists nieuwsbrief_akkoord boolean not null default false;
