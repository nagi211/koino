-- Friendster-style profile wall: public testimonials/comments other users leave on
-- your profile. Immediately visible (no moderation queue, matching post_comments) —
-- the Report system is the backstop, so it needs a new target type for these.

alter type report_target add value 'profile_comment';

create table profile_comments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

alter table profile_comments enable row level security;

create policy "profile comments are publicly readable"
  on profile_comments for select
  using (true);

-- Mirrors post_comments: only active members can write, anyone's wall.
create policy "active members can post to a wall"
  on profile_comments for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status = 'active')
  );

-- The wall owner can moderate their own wall; authors can delete their own comment.
create policy "wall owner or comment author can delete"
  on profile_comments for delete
  using (profile_id = auth.uid() or author_id = auth.uid());
