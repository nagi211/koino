-- Friendster-style profile customization: a longer About Me, and a theme (solid
-- color and/or background image) for the profile page.

alter table profiles add column about_me text;
alter table profiles add column theme_color text;
alter table profiles add column theme_image_url text;

insert into storage.buckets (id, name, public)
values ('profile-themes', 'profile-themes', true)
on conflict (id) do nothing;

create policy "profile theme images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-themes');

create policy "users can upload their own profile theme image"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-themes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users can replace their own profile theme image"
  on storage.objects for update
  using (
    bucket_id = 'profile-themes'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
