-- start_dm_conversation required status='active' on the caller and only
-- recognized a confirmed friendship — neither matches the rule the rest of
-- the app already applies to family/friends (status<>'suspended', and
-- family counts as an automatic friend — see 0032_family_circles.sql,
-- 0038_friends_family_automatic.sql). A guest could already see and post to
-- their family/friends circle but couldn't message them at all, and two
-- people connected only as family (never as friends) couldn't message each
-- other regardless of status. Widens both checks to match.
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

  if not exists (select 1 from profiles where id = caller_id and status <> 'suspended') then
    raise exception 'suspended members cannot start a conversation';
  end if;

  if not exists (
    select 1 from friendships
    where status = 'accepted'
      and ((requester_id = caller_id and addressee_id = other_id) or (requester_id = other_id and addressee_id = caller_id))
  ) and not exists (
    select 1 from family_connections
    where status = 'accepted'
      and ((requester_id = caller_id and addressee_id = other_id) or (requester_id = other_id and addressee_id = caller_id))
  ) then
    raise exception 'you can only message friends or family';
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
