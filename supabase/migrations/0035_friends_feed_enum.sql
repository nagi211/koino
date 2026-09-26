-- Third post audience, parallel to 'family' (0032) but scoped to friendships
-- instead of family_connections. This has to be its own migration, run and
-- committed before 0036: Postgres forbids using a freshly added enum value
-- in the same transaction that added it, and 0036's policies reference
-- audience = 'friends'.
alter type post_audience add value 'friends';
