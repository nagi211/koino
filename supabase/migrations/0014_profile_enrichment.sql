-- Additional profile fields, plus profile-level likes and unique-view tracking.

alter table profiles add column gender text check (gender in ('male', 'female'));
alter table profiles add column birthday date;
alter table profiles add column location text;
alter table profiles add column hobbies text;
alter table profiles add column photo_settings jsonb;

-- Liking a whole profile (distinct from liking a specific post).
create table profile_likes (
  profile_id uuid not null references profiles(id) on delete cascade,
  liker_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, liker_id),
  constraint profile_likes_no_self check (profile_id <> liker_id)
);

alter table profile_likes enable row level security;

create policy "profile likes are publicly readable"
  on profile_likes for select
  using (true);

create policy "active members can like a profile"
  on profile_likes for insert
  with check (
    liker_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status = 'active')
  );

create policy "users can remove their own profile like"
  on profile_likes for delete
  using (liker_id = auth.uid());

-- Unique profile views: one row per (profile, viewer), signed-in viewers only —
-- there's no stable identity to dedupe anonymous guests by. The no-self check means
-- visiting your own profile never counts.
create table profile_views (
  profile_id uuid not null references profiles(id) on delete cascade,
  viewer_id uuid not null references profiles(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (profile_id, viewer_id),
  constraint profile_views_no_self check (profile_id <> viewer_id)
);

alter table profile_views enable row level security;

create policy "profile view counts are publicly readable"
  on profile_views for select
  using (true);

create policy "viewers can record their own profile view"
  on profile_views for insert
  with check (viewer_id = auth.uid());