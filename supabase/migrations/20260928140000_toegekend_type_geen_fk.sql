-- toegekend_type is een uitkomstlabel (bijv. '8X'). De rekenkern kan een type
-- opleveren dat nog niet als adviesdocument geïmporteerd is; de FK zou dat blokkeren.
-- Integriteit borgt de productie-check (mapping compleet + alle types geïmporteerd).
alter table public.orders
  drop constraint if exists orders_toegekend_type_fkey;
