-- Stories were always visible on the public feed to literally anyone,
-- including guests — no audience concept at all. Bringing them in line with
-- posts: a story is now posted to family or friends (never public), and
-- only shows up on the feed matching its audience, same "family counts as
-- an automatic friend" rule already used for posts (0038) and post tags
-- (0047).

alter table stories add column audience post_audience not null default 'friends';
alter table stories add constraint stories_audience_check check (audience in ('family', 'friends'));

drop policy "unexpired stories are publicly readable" on stories;

create policy "authors can view their own unexpired stories"
  on stories for select
  using (author_id = auth.uid() and expires_at > now());

create policy "family stories are visible to confirmed family"
  on stories for select
  using (
    expires_at > now()
    and audience = 'family'
    and exists (
      select 1 from family_connections
      where status = 'accepted'
        and ((requester_id = auth.uid() and addressee_id = stories.author_id) or (addressee_id = auth.uid() and requester_id = stories.author_id))
    )
  );

create policy "friends stories are visible to confirmed friends or family"
  on stories for select
  using (
    expires_at > now()
    and audience = 'friends'
    and (
      exists (
        select 1 from friendships
        where status = 'accepted'
          and ((requester_id = auth.uid() and addressee_id = stories.author_id) or (addressee_id = auth.uid() and requester_id = stories.author_id))
      )
      or exists (
        select 1 from family_connections
        where status = 'accepted'
          and ((requester_id = auth.uid() and addressee_id = stories.author_id) or (addressee_id = auth.uid() and requester_id = stories.author_id))
      )
    )
  );

drop policy "active members can create stories" on stories;
create policy "active members can create family or friends stories"
  on stories for insert
  with check (
    author_id = auth.uid()
    and audience in ('family', 'friends')
    and exists (select 1 from profiles where id = auth.uid() and status = 'active')
  );
