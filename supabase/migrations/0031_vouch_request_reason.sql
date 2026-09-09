-- The guest's own words on why they're reaching out — shown to leaders before
-- they claim (not just after, via the first chat message), so they can respond
-- meaningfully or route a prayer request to whoever's best suited. No RLS
-- change needed: the existing "guests create their own vouch request" insert
-- policy and "leaders see open or assigned vouch requests" select policy both
-- already operate on the whole row.
alter table vouch_requests add column reason text;
