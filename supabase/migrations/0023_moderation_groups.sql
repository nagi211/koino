-- "Groups": a leader's group is everyone they've personally vouched for
-- (vouch_requests.leader_id = them, status = 'vouched'). Pending posts and
-- reports are now scoped to a leader's own group instead of every leader
-- seeing everything; admins keep full unscoped visibility. Message requests
-- (vouch_requests) stay unscoped for everyone, since claiming one is how a
-- leader's group grows in the first place.

create function is_in_leaders_group(p_leader_id uuid, p_member_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from vouch_requests
    where leader_id = p_leader_id and guest_id = p_member_id and status = 'vouched'
  );
$$;

-- Replaces the blanket "leaders and admins can view all posts" from
-- 0002_leader_post_review.sql. getPendingPosts() itself needs no code change —
-- it's a plain `select * from posts where status='pending'`, so this policy
-- transparently narrows its results per caller.
drop policy "leaders and admins can view all posts" on posts;

create policy "leaders and admins can view posts in scope"
  on posts for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'leader')
      and is_in_leaders_group(auth.uid(), author_id)
    )
  );

-- Replaces "leaders and admins can view reports" from 0001_init.sql. Only
-- 'post' and 'profile_comment' map to an author today — 'message' reports are
-- defined in the schema (report_target enum) but unreachable from any UI, so
-- they simply won't match a leader's scope and stay admin-only, which is the
-- correct safe default rather than guessing at an author for them.
drop policy "leaders and admins can view reports" on reports;

create policy "leaders and admins can view reports in scope"
  on reports for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'leader')
      and (
        (target_type = 'post' and is_in_leaders_group(auth.uid(), (select author_id from posts where id = target_id)))
        or (target_type = 'profile_comment' and is_in_leaders_group(auth.uid(), (select author_id from profile_comments where id = target_id)))
      )
    )
  );

-- No UPDATE policy on reports has ever existed — resolving one had no RLS
-- path at all. Same scoping condition as the select policy above, so
-- "Dismiss" can be a plain client-side .update() with no RPC needed.
create policy "leaders and admins can resolve reports in scope"
  on reports for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'leader')
      and (
        (target_type = 'post' and is_in_leaders_group(auth.uid(), (select author_id from posts where id = target_id)))
        or (target_type = 'profile_comment' and is_in_leaders_group(auth.uid(), (select author_id from profile_comments where id = target_id)))
      )
    )
  )
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
    or (
      exists (select 1 from profiles where id = auth.uid() and role = 'leader')
      and (
        (target_type = 'post' and is_in_leaders_group(auth.uid(), (select author_id from posts where id = target_id)))
        or (target_type = 'profile_comment' and is_in_leaders_group(auth.uid(), (select author_id from profile_comments where id = target_id)))
      )
    )
  );

-- The select-policy scoping above only controls what a leader can *see* — this
-- RPC is SECURITY DEFINER and previously only checked role, so a leader could
-- otherwise call it directly on a post outside their group (a raw devtools/API
-- call, exactly the kind of bypass attempt verified against earlier in this
-- session). Enforced here too, same admin-unscoped/leader-scoped branch.
create or replace function set_post_status(post_id uuid, new_status post_status, reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_author_id uuid;
  caller_role profile_role;
begin
  select role into caller_role from profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('leader', 'admin') then
    raise exception 'only leaders/admins can set post status';
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
