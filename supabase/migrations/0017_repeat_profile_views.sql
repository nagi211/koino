-- Previously a viewer could only ever be recorded once per profile, ever (the
-- primary key was just profile_id+viewer_id), so "views" and "unique viewers"
-- were always the same number. Add a date component to the key so the same
-- viewer can add a new view once per calendar day going forward — "viewers"
-- (distinct people) and "total views" (all visits) are now genuinely different,
-- and both are worth showing.
alter table profile_views add column viewed_date date not null default current_date;

alter table profile_views drop constraint profile_views_pkey;
alter table profile_views add primary key (profile_id, viewer_id, viewed_date);
