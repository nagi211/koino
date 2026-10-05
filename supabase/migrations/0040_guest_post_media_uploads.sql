-- Guests (non-suspended, not yet vouched) can already post text to family
-- and friends (see 0032_family_circles.sql, 0038_friends_family_automatic.sql),
-- but uploading a photo/video for that same post hit a separate, stricter
-- gate here that was never updated to match — this bucket's insert policy
-- still required status='active', so the storage upload itself failed
-- before the post row was ever created. Widening it to the same
-- status<>'suspended' rule the posts table already uses; the composer's own
-- audienceOptions still only ever offers an audience the viewer can
-- actually post to, so this doesn't open up anything the posts table
-- wouldn't already allow.
drop policy "active members can upload post media" on storage.objects;
create policy "non-suspended members can upload post media"
  on storage.objects for insert
  with check (
    bucket_id = 'post-media'
    and exists (select 1 from profiles where id = auth.uid() and status <> 'suspended')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
