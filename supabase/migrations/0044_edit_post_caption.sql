-- Lets a post's author correct/edit its body (caption) after publishing —
-- there was no UPDATE policy on posts at all before this, so the only way
-- to change a post's content was delete-and-repost. Every other column is
-- pinned to its existing value via the self-join subqueries below (same
-- pattern as profiles' own "non-privileged fields" policy, 0016), so this
-- can't be used to sneak past moderation (status) or widen who sees a post
-- (audience) via a raw update call that bypasses the composer's own UI.
create policy "authors can edit their own post caption"
  on posts for update
  using (author_id = auth.uid())
  with check (
    author_id = auth.uid()
    and type = (select p.type from posts p where p.id = posts.id)
    and status = (select p.status from posts p where p.id = posts.id)
    and audience = (select p.audience from posts p where p.id = posts.id)
    and media_url is not distinct from (select p.media_url from posts p where p.id = posts.id)
    and background is not distinct from (select p.background from posts p where p.id = posts.id)
    and text_size is not distinct from (select p.text_size from posts p where p.id = posts.id)
    and created_at = (select p.created_at from posts p where p.id = posts.id)
  );
