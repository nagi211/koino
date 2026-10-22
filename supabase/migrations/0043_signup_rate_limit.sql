-- Nothing currently stops one person from scripting unlimited account
-- creation (no captcha, no rate limit beyond whatever Supabase's own
-- dashboard-level auth limits already apply). This adds a lightweight,
-- IP-based limit the app checks before every signup attempt.
--
-- The table itself has RLS enabled with no policies at all — a client can
-- never read or write it directly, only through the function below, which
-- is SECURITY DEFINER (same pattern as every other privileged action in
-- this schema, e.g. start_dm_conversation). The IP itself has to come from
-- the server (apps/web/app/api/signup-guard/route.ts reads it from the
-- request headers) — a value the client supplied itself couldn't be trusted
-- at all, since a script could just lie about its own IP to bypass this
-- entirely.
create table signup_attempts (
  id uuid primary key default gen_random_uuid(),
  ip_address text not null,
  created_at timestamptz not null default now()
);

create index signup_attempts_ip_created_idx on signup_attempts (ip_address, created_at);

alter table signup_attempts enable row level security;

create function check_and_record_signup_attempt(p_ip text, p_limit int, p_window_minutes int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  select count(*) into v_count
  from signup_attempts
  where ip_address = p_ip
    and created_at > now() - (p_window_minutes || ' minutes')::interval;

  if v_count >= p_limit then
    return false;
  end if;

  insert into signup_attempts (ip_address) values (p_ip);
  return true;
end;
$$;

grant execute on function check_and_record_signup_attempt(text, int, int) to anon, authenticated;
