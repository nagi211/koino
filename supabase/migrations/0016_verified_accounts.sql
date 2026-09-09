-- A "verified" trust flag, independent of the pending/active/suspended lifecycle.
-- Kept as a separate boolean rather than a new status value because status is already
-- checked directly (status = 'active') in ~8 RLS policies across earlier migrations;
-- adding a status value above 'active' would require updating all of them to avoid
-- regressing verified users' ability to post/like/comment. A verified member's new
-- posts skip the leader approval queue, as do leaders'/admins' own posts.

alter table profiles add column verified boolean not null default false;

-- The existing self-update policy only pinned down status/role — without also pinning
-- verified, a user could grant themselves verified (and the approval bypass that comes
-- with it) via a plain updateProfile() call. set_profile_verified (SECURITY DEFINER)
-- still works since it bypasses RLS.
drop policy "users can update their own non-privileged profile fields" on profiles;

create policy "users can update their own non-privileged profile fields"
  on profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and status = (select status from profiles where id = auth.uid())
    and role = (select role from profiles where id = auth.uid())
    and verified = (select verified from profiles where id = auth.uid())
  );

-- Admin-only: verified is a trust grant, not a moderation action leaders take day to day.
create function set_profile_verified(target_id uuid, verified_value boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'only admins can set verified status';
  end if;

  update profiles set verified = verified_value where id = target_id;

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), case when verified_value then 'verify' else 'unverify' end, 'profile', target_id, null);
end;
$$;

-- Verified members' and leaders'/admins' posts skip the moderation queue entirely.
create function auto_approve_trusted_posts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (
    select 1 from profiles
    where id = new.author_id
      and (verified = true or role in ('leader', 'admin'))
  ) then
    new.status = 'approved';
  end if;
  return new;
end;
$$;

create trigger posts_auto_approve_trusted
  before insert on posts
  for each row
  execute function auto_approve_trusted_posts();