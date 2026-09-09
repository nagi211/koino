-- Three fixes:
--
-- 1. Suspending someone didn't actually hide their existing posts — the public
--    feed policy only checked post status, never the author's account status.
--
-- 2. resolve_message_report_sender: lets an admin see WHO sent a reported
--    message (so they have someone to click through to and act on) without
--    exposing the message body itself — content stays private per the
--    deliberate tradeoff from 0023 (messages RLS is member-only, on purpose).
--    Admin-only, and only for a message that actually has a report on it —
--    not a general "look up any message's sender" primitive.

drop policy "approved posts are publicly readable" on posts;

create policy "approved posts from non-suspended authors are publicly readable"
  on posts for select
  using (
    (status = 'approved' and not exists (select 1 from profiles where id = author_id and status = 'suspended'))
    or author_id = auth.uid()
  );

create function resolve_message_report_sender(p_report_id uuid)
returns table(sender_id uuid, username text, avatar_url text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and role = 'admin') then
    raise exception 'only admins can resolve a message report''s sender';
  end if;

  return query
    select p.id, p.username, p.avatar_url
    from reports r
    join messages m on m.id = r.target_id
    join profiles p on p.id = m.sender_id
    where r.id = p_report_id and r.target_type = 'message';
end;
$$;
