-- Replaces pre-publish approval with post-publish monitoring: every post from
-- anyone who can post at all (status='active' is already required by RLS to
-- reach this trigger) is now approved instantly. Leaders/admins instead review
-- their group's recently-published posts and can still hide anything after
-- the fact — see getRecentPostsForModerator and the new /moderation page.
-- verified/leader/admin no longer need special-casing here since everyone who
-- reaches this trigger is already active; verified stays meaningful as a
-- visible trust badge, it just no longer gates post approval specifically.
create or replace function auto_approve_trusted_posts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.status = 'approved';
  return new;
end;
$$;

-- Resolve any posts still stuck pending from before this change — the review
-- UI that could act on them no longer exists.
update posts set status = 'approved' where status = 'pending';
