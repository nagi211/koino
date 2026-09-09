-- Friend connections, separate from the vouch system: vouching activates an account,
-- friending is a mutual social connection between any two profiles.

create type friendship_status as enum ('pending', 'accepted');

create table friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles(id) on delete cascade,
  addressee_id uuid not null references profiles(id) on delete cascade,
  status friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id)
);

-- Prevents both (A,B) and (B,A) existing as separate rows.
create unique index friendships_unique_unordered_pair
  on friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table friendships enable row level security;

create policy "users see their own friendships"
  on friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy "users can send friend requests"
  on friendships for insert
  with check (requester_id = auth.uid());

-- Only the addressee can accept; either side can later remove the friendship (see delete).
create policy "addressee can accept a request"
  on friendships for update
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid());

create policy "either side can delete the friendship"
  on friendships for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());
