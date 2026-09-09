-- Another pre-existing-but-never-exercised bug, same story as 0021: a CASE
-- expression whose branches are all untyped string literals resolves to `text`
-- in this position (unlike a bare literal, which stays "unknown" and takes the
-- target column's type via implicit assignment cast) — confirmed live: "column
-- \"status\" is of type vouch_status but expression is of type text". Needs an
-- explicit cast. Applies the same fix to this migration's own new
-- vouch_approved/vouch_declined CASE expression for the same reason.
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
  set status = (case when approve then 'vouched' else 'declined' end)::vouch_status
  where id = request_id;

  if approve then
    update profiles set status = 'active' where id = target_guest_id;
  end if;

  insert into notifications (recipient_id, actor_id, type)
  values (target_guest_id, auth.uid(), (case when approve then 'vouch_approved' else 'vouch_declined' end)::notification_type);

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), case when approve then 'vouch' else 'decline_vouch' end, 'profile', target_guest_id, null);
end;
$$;
