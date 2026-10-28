-- 0044's UPDATE policy queries posts from within posts' own policy (to
-- compare the new row's columns against the existing row's), which Postgres
-- re-applies RLS to — infinite recursion (confirmed live: error 42P17
-- "infinite recursion detected in policy for relation posts"), the exact
-- same class of bug 0021_fix_conversation_members_recursion.sql hit and
-- fixed the same way: a SECURITY DEFINER function bypasses RLS internally,
-- so the lookup no longer re-triggers this table's own policy.
create function post_unchanged_fields(p_id uuid)
returns table (type post_type, status post_status, audience post_audience, media_url text, background text, text_size int, created_at timestamptz)
language sql
security definer
set search_path = public
stable
as $$
  select type, status, audience, media_url, background, text_size, created_at
  from posts
  where id = p_id;
$$;

drop policy "authors can edit their own post caption" on posts;
create policy "authors can edit their own post caption"
  on posts for update
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and type = (select type from post_unchanged_fields(posts.id))
    and status = (select status from post_unchanged_fields(posts.id))
    and audience = (select audience from post_unchanged_fields(posts.id))
    and media_url is not distinct from (select media_url from post_unchanged_fields(posts.id))
    and background is not distinct from (select background from post_unchanged_fields(posts.id))
    and text_size is not distinct from (select text_size from post_unchanged_fields(posts.id))
    and created_at = (select created_at from post_unchanged_fields(posts.id))
  );
