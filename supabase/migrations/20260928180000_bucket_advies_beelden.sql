-- Privé-bucket voor de beelden in de adviezen (silhouetten, voorbeelden).
-- Was al op de database toegepast; hier vastgelegd zodat de repo compleet is.
insert into storage.buckets (id, name, public)
values ('advies-beelden', 'advies-beelden', false)
on conflict (id) do nothing;
