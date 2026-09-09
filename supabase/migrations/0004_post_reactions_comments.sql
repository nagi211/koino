-- Likes and comments on posts.

create table post_likes (
  post_id uuid not null references posts(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create table post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table post_likes enable row level security;
alter table post_comments enable row level security;

-- Visible wherever the underlying post is visible (approved, or your own pending one).
create policy "likes visible with their post"
  on post_likes for select
  using (
    exists (
      select 1 from posts
      where posts.id = post_likes.post_id
        and (posts.status = 'approved' or posts.author_id = auth.uid())
    )
  );

create policy "comments visible with their post"
  on post_comments for select
  using (
    exists (
      select 1 from posts
      where posts.id = post_comments.post_id
        and (posts.status = 'approved' or posts.author_id = auth.uid())
    )
  );

-- Only active members can react/comment, and only on already-approved posts —
-- mirrors the posting/reporting rules elsewhere in the schema.
create policy "active members can like approved posts"
  on post_likes for insert
  with check (
    profile_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status = 'active')
    and exists (select 1 from posts where id = post_id and status = 'approved')
  );

create policy "members can remove their own like"
  on post_likes for delete
  using (profile_id = auth.uid());

create policy "active members can comment on approved posts"
  on post_comments for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status = 'active')
    and exists (select 1 from posts where id = post_id and status = 'approved')
  );

create policy "authors can delete their own comments"
  on post_comments for delete
  using (author_id = auth.uid());
