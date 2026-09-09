-- Three RPCs use a parameter name that shadows an admin_actions/role_endorsements
-- column of the same name (candidate_id, target_id), which Postgres's plpgsql
-- resolver rejects as ambiguous (error 42702) the moment the function actually
-- runs — confirmed live against endorse_for_leader. set_profile_verified (0016)
-- has the identical target_id-vs-admin_actions.target_id shape and would fail the
-- same way; set_profile_role (0025) never worked either. All three renamed to a
-- p_-prefixed parameter, matching the convention already used by
-- is_in_leaders_group to avoid exactly this class of bug.

-- CREATE OR REPLACE cannot rename an input parameter, so each function is
-- dropped first (identity is name + argument types, unaffected by this).
drop function endorse_for_leader(uuid);
drop function set_profile_role(uuid, profile_role);
drop function set_profile_verified(uuid, boolean);

create function endorse_for_leader(p_candidate_id uuid)
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

  select status, role into target_status, target_role from profiles where id = p_candidate_id;
  if target_status is distinct from 'active' or target_role is distinct from 'member' then
    raise exception 'candidate is not an eligible active member';
  end if;

  if caller_role = 'leader' and not is_in_leaders_group(auth.uid(), p_candidate_id) then
    raise exception 'this member is outside your group';
  end if;

  insert into role_endorsements (candidate_id, endorser_id)
  values (p_candidate_id, auth.uid())
  on conflict (candidate_id, endorser_id) do nothing;

  select count(*) into endorsement_count
  from role_endorsements
  where role_endorsements.candidate_id = p_candidate_id;

  if endorsement_count >= 2 then
    update profiles set role = 'leader' where id = p_candidate_id;

    insert into notifications (recipient_id, actor_id, type)
    values (p_candidate_id, auth.uid(), 'promoted_to_leader');

    insert into admin_actions (admin_id, action, target_type, target_id, notes)
    values (auth.uid(), 'promote_to_leader', 'profile', p_candidate_id, null);
  end if;
end;
$$;

create function set_profile_role(p_target_id uuid, new_role profile_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'only admins can set roles directly';
  end if;

  update profiles set role = new_role where id = p_target_id;

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), 'set_role:' || new_role, 'profile', p_target_id, null);
end;
$$;

create function set_profile_verified(p_target_id uuid, verified_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'only admins can set verified status';
  end if;

  update profiles set verified = verified_value where id = p_target_id;

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), case when verified_value then 'verify' else 'unverify' end, 'profile', p_target_id, null);
end;
$$;
