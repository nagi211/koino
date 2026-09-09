-- Pre-existing bug in 0001_init.sql, only now exposed because this is the first
-- feature to ever exercise the conversations/messages schema: "members can see
-- conversation membership" evaluates a subquery against conversation_members
-- from within conversation_members' own SELECT policy, which Postgres re-applies
-- RLS to — infinite recursion (confirmed live: error 42P17 "infinite recursion
-- detected in policy for relation conversation_members"). This also broke
-- reading back a freshly-inserted conversations row, since that table's own
-- SELECT policy queries conversation_members too.
--
-- Fixed the same way conversation_type_of() already sidesteps this for
-- conversations: a SECURITY DEFINER function bypasses RLS internally, so the
-- membership check no longer re-triggers this table's own policy.
create function is_conversation_member(conv_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from conversation_members
    where conversation_id = conv_id and profile_id = auth.uid()
  );
$$;

drop policy "members can see conversation membership" on conversation_members;

create policy "members can see conversation membership"
  on conversation_members for select
  using (is_conversation_member(conversation_id));
