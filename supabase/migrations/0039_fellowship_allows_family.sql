-- Fellowship (top_friends) could only feature a confirmed friend. Family is
-- now an automatic friend everywhere else in the app (see
-- 0038_friends_family_automatic.sql) — this extends that same reasoning
-- here, so a confirmed family connection also qualifies, not just a
-- friendships row. The table/column names stay as-is (top_friends.friend_id
-- is just a generic profiles(id) FK, so no schema change is needed).
drop policy "users can feature their own accepted friends" on top_friends;
create policy "users can feature their own accepted friends or family"
  on top_friends for insert
  with check (
    profile_id = auth.uid()
    and (
      exists (
        select 1 from friendships
        where status = 'accepted'
          and ((requester_id = profile_id and addressee_id = friend_id)
            or (requester_id = friend_id and addressee_id = profile_id))
      )
      or exists (
        select 1 from family_connections
        where status = 'accepted'
          and ((requester_id = profile_id and addressee_id = friend_id)
            or (requester_id = friend_id and addressee_id = profile_id))
      )
    )
  );
