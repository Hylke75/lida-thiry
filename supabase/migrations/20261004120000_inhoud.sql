-- Beheerbare teksten (website, test, e-mails, voorwaarden en privacy).
-- Eén rij per sectie (bijv. 'website.hero'); waarde is een object met de velden
-- van die sectie. Ontbreekt een rij, dan gebruikt de site de standaardtekst uit
-- de code (src/lib/inhoud). Alleen server-side gelezen via de service-role.

create table public.inhoud (
  sleutel text primary key check (sleutel ~ '^[a-z0-9_]+(\.[a-z0-9_]+)+$'),
  waarde jsonb not null check (jsonb_typeof(waarde) = 'object'),
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);
create trigger trg_inhoud_bijgewerkt
  before update on public.inhoud
  for each row execute function public.set_bijgewerkt_op();
alter table public.inhoud enable row level security;
