-- Reverses the "aren't also family" exclusion from 0036: family is an
-- automatic friend, so confirmed family can now see a friends-audience post
-- too, same as a confirmed friend. Family-feed visibility itself is untouched
-- (still strictly family-only) — this only widens who can see a FRIENDS post.
drop policy "friends posts are visible to confirmed friends who aren't also family" on posts;
create policy "friends posts are visible to confirmed friends or family" on posts for select
  using (
    audience = 'friends'
    and (
      exists (
        select 1 from friendships
        where status = 'accepted'
          and ((requester_id = auth.uid() and addressee_id = posts.author_id) or (addressee_id = auth.uid() and requester_id = posts.author_id))
      )
      or exists (
        select 1 from family_connections
        where status = 'accepted'
          and ((requester_id = auth.uid() and addressee_id = posts.author_id) or (addressee_id = auth.uid() and requester_id = posts.author_id))
      )
    )
  );

-- Posting to friends now follows the same non-suspended carve-out as family,
-- not the public active-only rule: family is automatically friends, so a
-- guest who can already post to their family circle (0032) can post to
-- friends too — there's no separate, stricter trust boundary between the two
-- any more.
drop policy "post publicly or to friends if active, post to family if not suspended" on posts;
create policy "post publicly if active, post to family or friends if not suspended"
  on posts for insert
  with check (
    author_id = auth.uid()
    and (
      (audience = 'public' and exists (select 1 from profiles where id = auth.uid() and status = 'active'))
      or (audience in ('family', 'friends') and exists (select 1 from profiles where id = auth.uid() and status <> 'suspended'))
    )
  );
