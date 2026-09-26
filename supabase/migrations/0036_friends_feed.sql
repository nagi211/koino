-- Friends-only posts: visible to confirmed friends who are NOT also confirmed
-- family — family already has its own feed (0032), so this avoids the same
-- author's posts doubling up across both when two people are connected both
-- ways.
create policy "friends posts are visible to confirmed friends who aren't also family" on posts for select
  using (
    audience = 'friends'
    and exists (
      select 1 from friendships
      where status = 'accepted'
        and ((requester_id = auth.uid() and addressee_id = posts.author_id) or (addressee_id = auth.uid() and requester_id = posts.author_id))
    )
    and not exists (
      select 1 from family_connections
      where status = 'accepted'
        and ((requester_id = auth.uid() and addressee_id = posts.author_id) or (addressee_id = auth.uid() and requester_id = posts.author_id))
    )
  );

-- Posting to friends follows the PUBLIC rule (active-only), not family's
-- non-suspended carve-out: family is a real-world relationship that predates
-- the app, so it gets an exception from the vouch gate; a "friend" here is
-- just a mutual add between two profiles, which doesn't carry the same
-- built-in trust and shouldn't reopen the spam/abuse risk the vouch gate
-- exists to close, just inside a smaller circle.
drop policy "post publicly if active, post to family if not suspended" on posts;
create policy "post publicly or to friends if active, post to family if not suspended"
  on posts for insert
  with check (
    author_id = auth.uid()
    and (
      (audience in ('public', 'friends') and exists (select 1 from profiles where id = auth.uid() and status = 'active'))
      or (audience = 'family' and exists (select 1 from profiles where id = auth.uid() and status <> 'suspended'))
    )
  );
