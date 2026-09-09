-- Personal bookmarks. Lower-friction than likes/comments — any signed-in profile
-- can save (no 'active' requirement), since it doesn't affect other users or content.

create table saved_posts (
  post_id uuid not null references posts(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

alter table saved_posts enable row level security;

create policy "users can see their own saved posts"
  on saved_posts for select
  using (profile_id = auth.uid());

create policy "users can save approved posts"
  on saved_posts for insert
  with check (
    profile_id = auth.uid()
    and exists (select 1 from posts where id = post_id and status = 'approved')
  );

create policy "users can remove their own saved post"
  on saved_posts for delete
  using (profile_id = auth.uid());
