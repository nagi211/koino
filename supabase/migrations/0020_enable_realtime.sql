-- notifications (this feature) and messages (the vouching chat, also newly wired
-- up to a UI for the first time) both subscribe via postgres_changes, but neither
-- table was ever added to the supabase_realtime publication — confirmed live via
-- the websocket's own error: "Unable to subscribe to changes ... Please check
-- Realtime is enabled for the given connect parameters". Guarded with an exists
-- check so re-running this migration isn't an error if a table's already added.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
