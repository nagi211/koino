-- Where each profile panel sits on the grid (position + size), so users can drag
-- and resize their MySpace-style profile panels. Validated app-side as a bounded
-- array of {i, x, y, w, h} — same reasoning as the theme column: no raw layout/CSS.

alter table profiles add column layout jsonb;