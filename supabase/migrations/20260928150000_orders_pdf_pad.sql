-- Pad naar de gegenereerde advies-PDF in de privé-bucket 'adviezen-pdf'.
alter table public.orders
  add column if not exists pdf_pad text;
