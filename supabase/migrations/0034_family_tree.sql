-- Multi-hop family tree traversal: extends visibility from "only the two
-- people in a connection can see it" to "anyone transitively reachable via
-- accepted connections, up to max_depth hops, can see it" — entirely inside
-- this SECURITY DEFINER function, so the underlying family_connections RLS
-- policies (still scoped to the caller's own rows) don't need to change.
create function get_family_tree(max_depth int default 4)
returns table(
  connection_id uuid,
  person_a uuid,        -- requester_id
  person_a_depth int,   -- hops from caller to person_a
  person_b uuid,        -- addressee_id
  person_b_depth int,   -- hops from caller to person_b
  relationship family_relationship
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with recursive reach(person_id, depth) as (
    select auth.uid(), 0
    union
    select
      case when fc.requester_id = r.person_id then fc.addressee_id else fc.requester_id end,
      r.depth + 1
    from family_connections fc
    join reach r on (fc.requester_id = r.person_id or fc.addressee_id = r.person_id)
    where fc.status = 'accepted' and r.depth < max_depth
  ),
  reachable as (
    select person_id, min(depth) as depth from reach group by person_id
  )
  select fc.id, fc.requester_id, ra.depth, fc.addressee_id, rb.depth, fc.relationship
  from family_connections fc
  join reachable ra on ra.person_id = fc.requester_id
  join reachable rb on rb.person_id = fc.addressee_id
  where fc.status = 'accepted';
end;
$$;
