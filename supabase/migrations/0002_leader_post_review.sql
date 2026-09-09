-- Leaders/admins need to see pending (and rejected/hidden) posts to moderate them.
-- The existing "approved posts are publicly readable" policy only covers
-- status='approved' or your own posts; this adds an OR'd policy for reviewers.
create policy "leaders and admins can view all posts"
  on posts for select
  using (exists (select 1 from profiles where id = auth.uid() and role in ('leader', 'admin')));
