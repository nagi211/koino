-- Admin-only status override — the missing piece for "suspend a user": suspended
-- has existed as an enum value since 0001 but nothing could ever set it. Parallels
-- set_profile_role (0025/0026). Parameter is p_-prefixed from the start this time:
-- target_id would collide with admin_actions.target_id and hit the exact
-- ambiguous-column bug fixed in 0026.

create function set_profile_status(p_target_id uuid, new_status profile_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'only admins can set account status directly';
  end if;

  update profiles set status = new_status where id = p_target_id;

  insert into admin_actions (admin_id, action, target_type, target_id, notes)
  values (auth.uid(), 'set_status:' || new_status, 'profile', p_target_id, null);
end;
$$;
