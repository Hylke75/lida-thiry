-- Moment waarop de herinneringsmail (test nog niet gestart) is verstuurd.
alter table public.orders
  add column if not exists herinnering_verzonden_op timestamptz;

create index if not exists orders_herinnering_idx
  on public.orders (betaald_op)
  where status = 'betaald' and herinnering_verzonden_op is null;
