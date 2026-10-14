-- start_dm_conversation only ever looked for an existing type='dm' row, so
-- two people who already share a leader_chat (the vouch-flow conversation,
-- see 0019_notifications.sql) but later become friends got a second,
-- redundant conversation the moment one of them clicked "Message" — the app
-- had no way to know the leader_chat was effectively the same thread. Widens
-- the lookup to also reuse a leader_chat, but only when it's still exactly
-- the two of them (a leader_chat that picked up a third member — e.g. a
-- second leader who also claimed it — is left alone rather than repurposed
-- into a "private" DM that secretly isn't).
create or replace function start_dm_conversation(other_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  existing_id uuid;
  new_id uuid;
begin
  if caller_id = other_id then
    raise exception 'cannot message yourself';
  end if;

  if not exists (select 1 from profiles where id = caller_id and status = 'active') then
    raise exception 'only active members can start a conversation';
  end if;

  if not exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester_id = caller_id and addressee_id = other_id) or (requester_id = other_id and addressee_id = caller_id))
  ) then
    raise exception 'you can only message friends';
  end if;

  select c.id into existing_id
  from conversations c
  where c.type in ('dm', 'leader_chat')
    and exists (select 1 from conversation_members where conversation_id = c.id and profile_id = caller_id)
    and exists (select 1 from conversation_members where conversation_id = c.id and profile_id = other_id)
    and (select count(*) from conversation_members where conversation_id = c.id) = 2
  order by (c.type = 'dm') desc
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into conversations (type, created_by) values ('dm', caller_id) returning id into new_id;
  insert into conversation_members (conversation_id, profile_id) values (new_id, caller_id), (new_id, other_id);
  return new_id;
end;
$$;
