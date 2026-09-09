-- Every leader/admin privilege check so far tested role only, never status —
-- so suspending a leader/admin blocked their own posting/commenting/messaging
-- and hid their content, but left every bit of their moderation authority
-- intact: they could still claim/approve vouch requests, review reports,
-- hide/approve posts, and endorse people for promotion. This closes that by
-- adding "and status = 'active'" to every one of those checks — RLS policies
-- and RPC bodies alike. (The app-level /moderation page gate gets the same
-- treatment in code, not here.)

-- ---------- vouch_requests ----------

drop policy "leaders see open or assigned vouch requests" on vouch_requests;
create policy "leaders see open or assigned vouch requests"
  on vouch_requests for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role in ('leader', 'admin') and status = 'active')
    and (status = 'open' or leader_id = auth.uid())
  );

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
  if not exists (select 1 from profiles where id = auth.uid() and role in ('leader', 'admin') and status = 'active') then
    raise exception 'only active leaders can claim vouch requests';
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
  if not exists (select 1 from profiles where id = auth.uid() and role in ('leader', 'admin') and status = 'active') then
    raise exception 'only active leaders can vouch';
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

-- ---------- posts ----------

drop policy "leaders and admins can view posts in scope" on posts;
create policy "leaders and admins can view posts in scope"
  on posts for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active')
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'leader' and status = 'active')
      and is_in_leaders_group(auth.uid(), author_id)
    )
  );

create or replace function set_post_status(post_id uuid, new_status post_status, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_author_id uuid;
  caller_role profile_role;
  caller_status profile_status;
begin
  select role, status into caller_role, caller_status from profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('leader', 'admin') or caller_status <> 'active' then
    raise exception 'only active leaders/admins can set post status';
  end if;

  select author_id into target_author_id from posts where id = post_id;

  if caller_role = 'leader' and not is_in_leaders_group(auth.uid(), target_author_id) then
    raise exception 'this post is outside your group';
  end if;

  update posts set status = new_status, ai_flag_reason = coalesce(reason, ai_flag_reason) where id = post_id;

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), 'set_post_status:' || new_status, 'post', post_id, reason);
end;
$$;

-- ---------- reports ----------

drop policy "leaders and admins can view reports in scope" on reports;
create policy "leaders and admins can view reports in scope"
  on reports for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active')
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'leader' and status = 'active')
      and (
        (target_type = 'post' and is_in_leaders_group(auth.uid(), (select author_id from posts where id = target_id)))
        or (target_type = 'profile_comment' and is_in_leaders_group(auth.uid(), (select author_id from profile_comments where id = target_id)))
      )
    )
  );

drop policy "leaders and admins can resolve reports in scope" on reports;
create policy "leaders and admins can resolve reports in scope"
  on reports for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active')
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'leader' and status = 'active')
      and (
        (target_type = 'post' and is_in_leaders_group(auth.uid(), (select author_id from posts where id = target_id)))
        or (target_type = 'profile_comment' and is_in_leaders_group(auth.uid(), (select author_id from profile_comments where id = target_id)))
      )
    )
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active')
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'leader' and status = 'active')
      and (
        (target_type = 'post' and is_in_leaders_group(auth.uid(), (select author_id from posts where id = target_id)))
        or (target_type = 'profile_comment' and is_in_leaders_group(auth.uid(), (select author_id from profile_comments where id = target_id)))
      )
    )
  );

-- ---------- role_endorsements ----------

drop policy "leaders and admins can view endorsements in scope" on role_endorsements;
create policy "leaders and admins can view endorsements in scope"
  on role_endorsements for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active')
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'leader' and status = 'active')
      and is_in_leaders_group(auth.uid(), candidate_id)
    )
  );

create or replace function endorse_for_leader(p_candidate_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role profile_role;
  caller_status profile_status;
  target_status profile_status;
  target_role profile_role;
  endorsement_count int;
begin
  select role, status into caller_role, caller_status from profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('leader', 'admin') or caller_status <> 'active' then
    raise exception 'only active leaders/admins can endorse a candidate';
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

-- ---------- admin-only RPCs and audit log ----------

drop policy "admins can view the audit log" on admin_actions;
create policy "admins can view the audit log"
  on admin_actions for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active'));

create or replace function set_profile_verified(p_target_id uuid, verified_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active') then
    raise exception 'only active admins can set verified status';
  end if;

  update profiles set verified = verified_value where id = p_target_id;

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), case when verified_value then 'verify' else 'unverify' end, 'profile', p_target_id, null);
end;
$$;

create or replace function set_profile_role(p_target_id uuid, new_role profile_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active') then
    raise exception 'only active admins can set roles directly';
  end if;

  update profiles set role = new_role where id = p_target_id;

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), 'set_role:' || new_role, 'profile', p_target_id, null);
end;
$$;

create or replace function set_profile_status(p_target_id uuid, new_status profile_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active') then
    raise exception 'only active admins can set account status directly';
  end if;

  update profiles set status = new_status where id = p_target_id;

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), 'set_status:' || new_status, 'profile', p_target_id, null);
end;
$$;

create or replace function resolve_message_report_sender(p_report_id uuid)
returns table(sender_id uuid, username text, avatar_url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin' and status = 'active') then
    raise exception 'only active admins can resolve a message report''s sender';
  end if;

  return query
    select p.id, p.username, p.avatar_url
    from reports r
    join messages m on m.id = r.target_id
    join profiles p on p.id = m.sender_id
    where r.id = p_report_id and r.target_type = 'message';
end;
$$;
