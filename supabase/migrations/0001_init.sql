-- Koino MVP schema: profiles, vouching, messaging, posts, reports, audit log.
-- All privilege-changing actions (vouch, post approval, bans) go through
-- SECURITY DEFINER RPCs below rather than direct client writes to status/role columns.

create type profile_status as enum ('pending', 'active', 'suspended');
create type profile_role as enum ('member', 'leader', 'admin');
create type conversation_type as enum ('leader_chat', 'group_room');
create type vouch_status as enum ('open', 'claimed', 'vouched', 'declined');
create type post_type as enum ('text', 'image', 'video');
create type post_status as enum ('pending', 'approved', 'rejected', 'hidden');
create type report_target as enum ('post', 'message');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  bio text,
  status profile_status not null default 'pending',
  role profile_role not null default 'member',
  age_band text,
  created_at timestamptz not null default now()
);

create table vouch_requests (
  id uuid primary key default gen_random_uuid(),
  guest_id uuid not null references profiles(id) on delete cascade,
  leader_id uuid references profiles(id) on delete set null,
  status vouch_status not null default 'open',
  created_at timestamptz not null default now()
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  type conversation_type not null,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table conversation_members (
  conversation_id uuid not null references conversations(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  type post_type not null,
  body text,
  media_url text,
  status post_status not null default 'pending',
  ai_flag_reason text,
  created_at timestamptz not null default now()
);

create table reports (
  id uuid primary key default gen_random_uuid(),
  target_type report_target not null,
  target_id uuid not null,
  reporter_id uuid not null references profiles(id) on delete cascade,
  reason text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references profiles(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  notes text,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row (status='pending') whenever a new auth user signs up.
create function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ---------- RLS ----------

alter table profiles enable row level security;
alter table vouch_requests enable row level security;
alter table conversations enable row level security;
alter table conversation_members enable row level security;
alter table messages enable row level security;
alter table posts enable row level security;
alter table reports enable row level security;
alter table admin_actions enable row level security;

-- profiles: publicly readable (usernames/avatars aren't sensitive), self-updatable
-- except status/role which are only ever changed via the RPCs below.
create policy "profiles are publicly readable"
  on profiles for select
  using (true);

create policy "users can update their own non-privileged profile fields"
  on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and status = (select status from profiles where id = auth.uid())
    and role = (select role from profiles where id = auth.uid())
  );

-- vouch_requests: a guest can create/see their own; leaders can see open ones or ones
-- assigned to them. All status transitions happen via claim_vouch_request/vouch_for_user.
create policy "guests manage their own vouch request"
  on vouch_requests for select
  using (guest_id = auth.uid());

create policy "guests create their own vouch request"
  on vouch_requests for insert
  with check (guest_id = auth.uid());

create policy "leaders see open or assigned vouch requests"
  on vouch_requests for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('leader', 'admin'))
    and (status = 'open' or leader_id = auth.uid())
  );

-- conversations: visible to its creator and its current members. Deliberately NOT
-- open to all authenticated users — conversation ids are unguessable UUIDs, and this
-- table isn't a directory of chats to browse. The join-rule policy below needs to check
-- a conversation's type for a user who isn't a member yet (e.g. a leader about to join
-- a guest's leader_chat); it does that through a SECURITY DEFINER function instead of a
-- direct read here, so it isn't blocked by this policy and doesn't need to widen it.
create policy "creators and members can see their conversations"
  on conversations for select
  using (
    created_by = auth.uid()
    or exists (
      select 1 from conversation_members
      where conversation_id = conversations.id and profile_id = auth.uid()
    )
  );

-- A pending guest must be able to create the leader_chat they use to request vouching,
-- so leader_chat creation is open to anyone; group_room creation is restricted to
-- active members/leaders (mirrors the join rule below).
create policy "conversation creation rules"
  on conversations for insert
  with check (
    created_by = auth.uid()
    and (
      type = 'leader_chat'
      or exists (
        select 1 from profiles
        where id = auth.uid()
          and (status = 'active' or role in ('leader', 'admin'))
      )
    )
  );

create policy "members can see conversation membership"
  on conversation_members for select
  using (
    exists (
      select 1 from conversation_members cm
      where cm.conversation_id = conversation_members.conversation_id and cm.profile_id = auth.uid()
    )
  );

-- Looks up a conversation's type bypassing RLS (SECURITY DEFINER), so the join-rule
-- policy below can check it for a joiner who isn't a member of that conversation yet —
-- without having to make the conversations table broadly readable to do so.
create function conversation_type_of(conv_id uuid)
returns conversation_type
language sql
security definer
set search_path = public
stable
as $$
  select type from conversations where id = conv_id;
$$;

-- Core safety rule: a 'pending' (guest) profile may only be added to a 'leader_chat'
-- conversation, never a 'group_room'.
create policy "join rules by conversation type and status"
  on conversation_members for insert
  with check (
    profile_id = auth.uid()
    and (
      conversation_type_of(conversation_id) = 'leader_chat'
      or (
        conversation_type_of(conversation_id) = 'group_room'
        and exists (select 1 from profiles where id = auth.uid() and status = 'active')
      )
    )
  );

create policy "members can read messages in their conversations"
  on messages for select
  using (
    exists (
      select 1 from conversation_members
      where conversation_id = messages.conversation_id and profile_id = auth.uid()
    )
  );

create policy "members can send messages in their conversations"
  on messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from conversation_members
      where conversation_id = messages.conversation_id and profile_id = auth.uid()
    )
  );

-- posts: public feed only shows approved posts; only active members can submit.
create policy "approved posts are publicly readable"
  on posts for select
  using (status = 'approved' or author_id = auth.uid());

create policy "active members can create posts"
  on posts for insert
  with check (
    author_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status = 'active')
  );

create policy "authors can delete their own pending or rejected posts"
  on posts for delete
  using (author_id = auth.uid() and status in ('pending', 'rejected'));

-- reports: anyone active can file; only leaders/admins can review.
create policy "active members can file reports"
  on reports for insert
  with check (
    reporter_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status = 'active')
  );

create policy "leaders and admins can view reports"
  on reports for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('leader', 'admin')));

create policy "admins can view the audit log"
  on admin_actions for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ---------- Privileged RPCs (SECURITY DEFINER) ----------

-- A leader claims an open vouch request so two leaders don't double-book a guest.
create function claim_vouch_request(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('leader', 'admin')) then
    raise exception 'only leaders can claim vouch requests';
  end if;

  update vouch_requests
  set leader_id = auth.uid(), status = 'claimed'
  where id = request_id and status = 'open';
end;
$$;

-- The only way a profile moves from 'pending' to 'active'. Also opens the leader_chat
-- conversation as a side effect isn't handled here — chat is created separately when the
-- guest first requests to talk (Phase 2).
create function vouch_for_user(request_id uuid, approve boolean)
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

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), case when approve then 'vouch' else 'decline_vouch' end, 'profile', target_guest_id, null);
end;
$$;

-- Admin/leader moderation decision on a post (used by the AI moderation Edge Function
-- and the human admin review queue alike).
create function set_post_status(post_id uuid, new_status post_status, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role in ('leader', 'admin')) then
    raise exception 'only leaders/admins can set post status';
  end if;

  update posts set status = new_status, ai_flag_reason = coalesce(reason, ai_flag_reason) where id = post_id;

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), 'set_post_status:' || new_status, 'post', post_id, reason);
end;
$$;
