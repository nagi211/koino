-- Multiple photos per post. `posts.media_url` stays as the cover/first image
-- (unchanged contract for anything that only ever read a single url — e.g.
-- the profile grid's latest-post thumbnail) — this table holds every image
-- in order, including that first one, so a post can render a full carousel.
-- Author-only, unlike post_tags (0047) — no third party has any say over a
-- post's own photos, so this is simpler: no friend/family clause needed.
create table post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  media_url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

alter table post_media enable row level security;

create policy "post media is visible if the post is visible"
  on post_media for select
  using (exists (select 1 from posts where posts.id = post_media.post_id));

create policy "post author can add media to their own post"
  on post_media for insert
  with check (exists (select 1 from posts where id = post_media.post_id and author_id = auth.uid()));

create policy "post author can remove media from their own post"
  on post_media for delete
  using (exists (select 1 from posts where id = post_media.post_id and author_id = auth.uid()));
