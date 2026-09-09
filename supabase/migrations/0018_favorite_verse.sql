-- Favorite Bible verse panel — fetched once from a public Bible API at
-- selection time and cached here, rather than re-fetched on every profile
-- view (keeps the profile page fast and independent of that API's uptime).
alter table profiles add column favorite_verse jsonb;
