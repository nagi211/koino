-- Post audience: 'family' posts are never public, regardless of status.
create type post_audience as enum ('public', 'family');
alter table posts add column audience post_audience not null default 'public';

-- Family connections — mirrors friendships (0007) exactly: same request/accept
-- shape, same unique-unordered-pair index, same RLS pattern. Kept as its own
-- table rather than extending friendships, since friend and family are meant
-- to stay independent of each other.
create type family_connection_status as enum ('pending', 'accepted');
create type family_relationship as enum
  ('mother', 'father', 'sister', 'brother', 'grandmother', 'grandfather', 'aunt', 'uncle', 'cousin', 'spouse', 'child', 'other');

create table family_connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  relationship family_relationship not null,
  status family_connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint family_connections_no_self check (requester_id <> addressee_id)
);
create unique index family_connections_unique_unordered_pair
  on family_connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table family_connections enable row level security;

create policy "see your own family connections" on family_connections for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());
-- Suspension blocks initiating (consistent with 0029's "suspension revokes
-- standing" principle) — not required on the addressee side, same as friendships.
create policy "request a family connection" on family_connections for insert
  with check (
    requester_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status <> 'suspended')
  );
create policy "addressee accepts a family connection" on family_connections for update
  using (addressee_id = auth.uid()) with check (addressee_id = auth.uid());
create policy "either side removes a family connection" on family_connections for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ---------- posts: close the two blanket policies, add family visibility ----------

drop policy "approved posts from non-suspended authors are publicly readable" on posts;
create policy "approved public posts from non-suspended authors are publicly readable"
  on posts for select
  using (
    (status = 'approved' and audience = 'public' and not exists (select 1 from profiles where id = author_id and status = 'suspended'))
    or author_id = auth.uid()
  );

drop policy "leaders and admins can view posts in scope" on posts;
create policy "leaders and admins can view public posts in scope"
  on posts for select
  using (
    (exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active') and audience = 'public')
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'leader' and status = 'active')
      and audience = 'public'
      and is_in_leaders_group(auth.uid(), author_id)
    )
  );

create policy "family posts are visible to confirmed family" on posts for select
  using (
    audience = 'family'
    and exists (
      select 1 from family_connections
      where status = 'accepted'
        and ((requester_id = auth.uid() and addressee_id = posts.author_id) or (addressee_id = auth.uid() and requester_id = posts.author_id))
    )
  );

-- Posting: active status still required for public posts; anyone not suspended
-- (including guests) can post to their own family circle.
drop policy "active members can create posts" on posts;
create policy "post publicly if active, post to family if not suspended"
  on posts for insert
  with check (
    author_id = auth.uid()
    and (
      (audience = 'public' and exists (select 1 from profiles where id = auth.uid() and status = 'active'))
      or (audience = 'family' and exists (select 1 from profiles where id = auth.uid() and status <> 'suspended'))
    )
  );

-- Reporting: widen from active-only to not-suspended, so a guest who can post/see
-- family content can also flag something within their own circle.
drop policy "active members can file reports" on reports;
create policy "non-suspended members can file reports" on reports for insert
  with check (
    reporter_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and status <> 'suspended')
  );

-- ---------- notifications ----------

alter type notification_type add value 'family_request';
alter type notification_type add value 'family_accept';

create function notify_family_request() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into notifications (recipient_id, actor_id, type) values (new.addressee_id, new.requester_id, 'family_request');
  return new;
end; $$;
create trigger family_connections_notify_request after insert on family_connections for each row execute function notify_family_request();

create function notify_family_accept() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'pending' and new.status = 'accepted' then
    insert into notifications (recipient_id, actor_id, type) values (new.requester_id, new.addressee_id, 'family_accept');
  end if;
  return new;
end; $$;
create trigger family_connections_notify_accept after update on family_connections for each row execute function notify_family_accept();
