-- Friendster's iconic "Top Friends" — a curated, ordered subset of your accepted
-- friends, shown on your profile. Publicly readable like the rest of a profile.

create table top_friends (
  profile_id uuid not null references profiles(id) on delete cascade,
  friend_id uuid not null references profiles(id) on delete cascade,
  position int not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, friend_id)
);

alter table top_friends enable row level security;

create policy "top friends are publicly readable"
  on top_friends for select
  using (true);

-- Can only feature someone you're actually (accepted) friends with.
create policy "users can feature their own accepted friends"
  on top_friends for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1 from friendships
      where status = 'accepted'
        and ((requester_id = profile_id and addressee_id = friend_id)
          or (requester_id = friend_id and addressee_id = profile_id))
    )
  );

create policy "users can edit their own top friends list"
  on top_friends for delete
  using (profile_id = auth.uid());
