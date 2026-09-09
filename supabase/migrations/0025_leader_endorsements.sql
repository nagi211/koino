-- Community-driven member -> leader promotion. A candidate needs 2 distinct
-- endorsements to be promoted: their own vouching leader (is_in_leaders_group,
-- from 0023_moderation_groups.sql) or any admin. Admin-only endorsements count
-- toward the threshold too — under the existing group model a candidate has
-- exactly one qualifying leader (whoever vouched them in), so "2 distinct
-- leader-only endorsements" would be structurally impossible otherwise.
--
-- set_profile_role is a separate admin-only override (bootstraps the first
-- leaders before an endorsement pool exists, and a safety valve to correct a
-- bad promotion or hand-demote), same audit-log pattern as set_profile_verified.

alter type notification_type add value 'promoted_to_leader';

create table role_endorsements (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references profiles(id) on delete cascade,
  endorser_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (candidate_id, endorser_id)
);

alter table role_endorsements enable row level security;

-- Same admin-unscoped / leader-scoped-to-their-group shape as posts/reports in 0023.
create policy "leaders and admins can view endorsements in scope"
  on role_endorsements for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'leader')
      and is_in_leaders_group(auth.uid(), candidate_id)
    )
  );

-- No insert/update/delete policy — writes only ever happen through the
-- SECURITY DEFINER RPC below, same reasoning as admin_actions/notifications.

create function endorse_for_leader(candidate_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role profile_role;
  target_status profile_status;
  target_role profile_role;
  endorsement_count int;
begin
  select role into caller_role from profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('leader', 'admin') then
    raise exception 'only leaders/admins can endorse a candidate';
  end if;

  select status, role into target_status, target_role from profiles where id = candidate_id;
  if target_status is distinct from 'active' or target_role is distinct from 'member' then
    raise exception 'candidate is not an eligible active member';
  end if;

  if caller_role = 'leader' and not is_in_leaders_group(auth.uid(), candidate_id) then
    raise exception 'this member is outside your group';
  end if;

  insert into role_endorsements (candidate_id, endorser_id)
  values (candidate_id, auth.uid())
  on conflict (candidate_id, endorser_id) do nothing;

  select count(*) into endorsement_count
  from role_endorsements
  where role_endorsements.candidate_id = endorse_for_leader.candidate_id;

  if endorsement_count >= 2 then
    update profiles set role = 'leader' where id = candidate_id;

    insert into notifications (recipient_id, actor_id, type)
    values (candidate_id, auth.uid(), 'promoted_to_leader');

    insert into admin_actions (admin_id, action, target_type, target_id, notes)
    values (auth.uid(), 'promote_to_leader', 'profile', candidate_id, null);
  end if;
end;
$$;

-- Admin-only override: bootstraps the first leaders, and a safety valve to correct
-- a bad promotion. Bidirectional (promote or demote) since it's the same primitive.
create function set_profile_role(target_id uuid, new_role profile_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'only admins can set roles directly';
  end if;

  update profiles set role = new_role where id = target_id;

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), 'set_role:' || new_role, 'profile', target_id, null);
end;
$$;
