-- Guests (any non-suspended account) can now like posts they can already see,
-- public or family — a like is reversible and never puts a guest's own text in
-- front of anyone, unlike commenting or posting, which stay active-only. The
-- existing `exists (select 1 from posts where id = post_id and status =
-- 'approved')` check still implicitly requires the post to be visible to the
-- caller (it's a normal SELECT subject to posts' own RLS), so this doesn't
-- open up liking posts a guest can't otherwise see.
drop policy "active members can like approved posts" on post_likes;
create policy "non-suspended members can like posts they can see"
  on post_likes for insert
  with check (
    profile_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status <> 'suspended')
    and exists (select 1 from posts where id = post_id and status = 'approved')
  );
