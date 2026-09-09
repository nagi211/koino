-- Notifications for existing social actions (post/profile likes & comments,
-- friend requests/accepts), plus the missing link needed to finish the
-- guest -> leader vouching flow that 0001_init.sql left as "Phase 2": a guest's
-- vouch_request now carries the leader_chat conversation it's paired with, and
-- claim_vouch_request/vouch_for_user notify the guest as that flow progresses.
--
-- Every row here is written by a trigger function or an existing SECURITY
-- DEFINER RPC running as table owner (which bypasses RLS) — there is
-- deliberately no insert policy for regular clients, same reasoning as
-- admin_actions having none: notifications aren't something a client can be
-- trusted to write for itself.

create type notification_type as enum (
  'post_like', 'post_comment',
  'profile_like', 'profile_comment',
  'friend_request', 'friend_accept',
  'vouch_claimed', 'vouch_approved', 'vouch_declined',
  'new_message'
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references profiles(id) on delete cascade,
  actor_id uuid references profiles(id) on delete set null,
  type notification_type not null,
  post_id uuid references posts(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx on notifications (recipient_id, created_at desc);

alter table notifications enable row level security;

create policy "recipients see their own notifications"
  on notifications for select
  using (recipient_id = auth.uid());

create policy "recipients can mark their own notifications read"
  on notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ---------- vouch_requests <-> conversations link ----------

-- The guest creates and joins the leader_chat conversation before calling
-- requestVouch, so a leader who later claims the request knows which
-- conversation to join (the "join rules" policy on conversation_members
-- already lets anyone join a leader_chat — ids are unguessable UUIDs).
alter table vouch_requests add column conversation_id uuid references conversations(id) on delete set null;

-- ---------- trigger functions: one per source table, each skips self-actions ----------

create function notify_post_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_author_id uuid;
begin
  select author_id into target_author_id from posts where id = new.post_id;
  if target_author_id is not null and target_author_id <> new.profile_id then
    insert into notifications (recipient_id, actor_id, type, post_id)
    values (target_author_id, new.profile_id, 'post_like', new.post_id);
  end if;
  return new;
end;
$$;

create trigger post_likes_notify
  after insert on post_likes
  for each row execute function notify_post_like();

create function notify_post_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_author_id uuid;
begin
  select author_id into target_author_id from posts where id = new.post_id;
  if target_author_id is not null and target_author_id <> new.author_id then
    insert into notifications (recipient_id, actor_id, type, post_id)
    values (target_author_id, new.author_id, 'post_comment', new.post_id);
  end if;
  return new;
end;
$$;

create trigger post_comments_notify
  after insert on post_comments
  for each row execute function notify_post_comment();

create function notify_profile_like()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id <> new.liker_id then
    insert into notifications (recipient_id, actor_id, type)
    values (new.profile_id, new.liker_id, 'profile_like');
  end if;
  return new;
end;
$$;

create trigger profile_likes_notify
  after insert on profile_likes
  for each row execute function notify_profile_like();

create function notify_profile_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.profile_id <> new.author_id then
    insert into notifications (recipient_id, actor_id, type)
    values (new.profile_id, new.author_id, 'profile_comment');
  end if;
  return new;
end;
$$;

create trigger profile_comments_notify
  after insert on profile_comments
  for each row execute function notify_profile_comment();

create function notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (recipient_id, actor_id, type)
  values (new.addressee_id, new.requester_id, 'friend_request');
  return new;
end;
$$;

create trigger friendships_notify_request
  after insert on friendships
  for each row execute function notify_friend_request();

create function notify_friend_accept()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'pending' and new.status = 'accepted' then
    insert into notifications (recipient_id, actor_id, type)
    values (new.requester_id, new.addressee_id, 'friend_accept');
  end if;
  return new;
end;
$$;

create trigger friendships_notify_accept
  after update on friendships
  for each row execute function notify_friend_accept();

create function notify_new_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (recipient_id, actor_id, type, conversation_id)
  select profile_id, new.sender_id, 'new_message', new.conversation_id
  from conversation_members
  where conversation_id = new.conversation_id and profile_id <> new.sender_id;
  return new;
end;
$$;

create trigger messages_notify
  after insert on messages
  for each row execute function notify_new_message();

-- ---------- extend the vouch RPCs to notify the guest as their request progresses ----------

create or replace function claim_vouch_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_guest_id uuid;
  target_conversation_id uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('leader', 'admin')) then
    raise exception 'only leaders can claim vouch requests';
  end if;

  update vouch_requests
  set leader_id = auth.uid(), status = 'claimed'
  where id = request_id and status = 'open'
  returning guest_id, conversation_id into target_guest_id, target_conversation_id;

  if target_guest_id is not null then
    insert into notifications (recipient_id, actor_id, type, conversation_id)
    values (target_guest_id, auth.uid(), 'vouch_claimed', target_conversation_id);
  end if;
end;
$$;

create or replace function vouch_for_user(request_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_guest_id uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('leader', 'admin')) then
    raise exception 'only leaders can vouch';
  end if;

  select guest_id into target_guest_id
  from vouch_requests
  where id = request_id and leader_id = auth.uid() and status = 'claimed';

  if target_guest_id is null then
    raise exception 'vouch request not found or not claimed by you';
  end if;

  update vouch_requests
  set status = case when approve then 'vouched' else 'declined' end
  where id = request_id;

  if approve then
    update profiles set status = 'active' where id = target_guest_id;
  end if;

  insert into notifications (recipient_id, actor_id, type)
  values (target_guest_id, auth.uid(), case when approve then 'vouch_approved' else 'vouch_declined' end);

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), case when approve then 'vouch' else 'decline_vouch' end, 'profile', target_guest_id, null);
end;
$$;
