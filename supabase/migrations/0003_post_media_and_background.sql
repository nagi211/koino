-- Photo/video posts need a place to upload media, and text-only posts can pick a
-- colored background card (Facebook/Instagram-style) instead of the plain card.

alter table posts add column background text;

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- Feed media is public once a post is approved, so the bucket itself is public-read.
create policy "post media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'post-media');

-- Mirrors the posts-insert rule (active members only), scoped to each user's own
-- uid-prefixed folder so one member can't overwrite another's files.
create policy "active members can upload post media"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media'
    and exists (select 1 from profiles where id = auth.uid() and status = 'active')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
