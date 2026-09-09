-- Basic stories: image posts that expire after 24h. No moderation queue for these
-- (unlike posts) — the short lifespan is the mitigation for a first version.

create table stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  media_url text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

alter table stories enable row level security;

create policy "unexpired stories are publicly readable"
  on stories for select
  using (expires_at > now());

-- Mirrors the posts-insert rule: only active members can create content.
create policy "active members can create stories"
  on stories for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status = 'active')
  );
