-- Lightweight "with @person" tagging on a post — not a pinned spot on a
-- photo, just a list of people shown under the post, same idea as
-- Facebook's "— with John Doe". Only the post's own author can tag anyone,
-- and only someone they're actually confirmed-connected to (friends or
-- family, same "family is an automatic friend" reasoning as everywhere
-- else in this schema) — not an arbitrary stranger.
create table post_tags (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  tagged_profile_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, tagged_profile_id)
);

alter table post_tags enable row level security;

-- Visible to anyone who can see the post itself — querying `posts` from
-- within a DIFFERENT table's policy is fine (recursion only happens when a
-- policy queries its own table), so this just inherits posts' existing
-- audience rules for free instead of re-deriving them here.
create policy "tags are visible if the post is visible"
  on post_tags for select
  using (exists (select 1 from posts where posts.id = post_tags.post_id));

create policy "post author can tag their confirmed friends or family"
  on post_tags for insert
  with check (
    exists (select 1 from posts where id = post_tags.post_id and author_id = auth.uid())
    and (
      exists (
        select 1 from friendships
        where status = 'accepted'
          and ((requester_id = auth.uid() and addressee_id = tagged_profile_id)
            or (addressee_id = auth.uid() and requester_id = tagged_profile_id))
      )
      or exists (
        select 1 from family_connections
        where status = 'accepted'
          and ((requester_id = auth.uid() and addressee_id = tagged_profile_id)
            or (addressee_id = auth.uid() and requester_id = tagged_profile_id))
      )
    )
  );

-- Either side can remove a tag: the author if they change their mind, or
-- the tagged person themselves as a courtesy (nobody has to stay tagged in
-- something they'd rather not be attached to).
create policy "post author or the tagged person can remove a tag"
  on post_tags for delete
  using (
    tagged_profile_id = auth.uid()
    or exists (select 1 from posts where id = post_tags.post_id and author_id = auth.uid())
  );

create function notify_post_tag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tagger_id uuid;
begin
  select author_id into tagger_id from posts where id = new.post_id;
  if tagger_id is not null and tagger_id <> new.tagged_profile_id then
    insert into notifications (recipient_id, actor_id, type, post_id)
    values (new.tagged_profile_id, tagger_id, 'post_tag', new.post_id);
  end if;
  return new;
end;
$$;

create trigger post_tags_notify
  after insert on post_tags
  for each row execute function notify_post_tag();
