-- General friend-to-friend DMs, sharing the same conversations/messages schema
-- the vouching chat already uses. No RLS policy changes needed anywhere else:
-- the existing SELECT policies on conversations/conversation_members/messages
-- are already generic (keyed on "are you a member", not on conversation type),
-- and this RPC bypasses the type-specific INSERT policies entirely, same as
-- every other privileged action in this schema.

alter type conversation_type add value 'dm';

create function start_dm_conversation(other_id uuid)
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

  -- Reuse an existing DM between these two if one's already there, instead of
  -- creating a new empty conversation every time "Message" is clicked.
  select c.id into existing_id
  from conversations c
  where c.type = 'dm'
    and exists (select 1 from conversation_members where conversation_id = c.id and profile_id = caller_id)
    and exists (select 1 from conversation_members where conversation_id = c.id and profile_id = other_id)
  limit 1;

  if existing_id is not null then
    return existing_id;
  end if;

  insert into conversations (type, created_by) values ('dm', caller_id) returning id into new_id;
  insert into conversation_members (conversation_id, profile_id) values (new_id, caller_id), (new_id, other_id);
  return new_id;
end;
$$;
