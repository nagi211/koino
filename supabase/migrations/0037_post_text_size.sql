-- Lets a text-only post with a colored background choose its own text size
-- (px), instead of the fixed size every such post rendered at before. Null
-- for every existing post — the app falls back to the old fixed size when
-- this is unset, so nothing already posted changes appearance.
alter table posts add column text_size int;
