-- Postgres requires a new enum value to be committed in its own transaction
-- before anything in the same migration run can reference it — see every
-- other "_enum.sql" migration in this repo for the same split (e.g.
-- 0035_friends_feed_enum.sql before 0036_friends_feed.sql).
alter type notification_type add value 'post_tag';
