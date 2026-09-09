-- Full per-panel theming for the MySpace-style profile grid: page background
-- (color + optional image), and each panel's background/border/text/accent colors.
-- Stored as jsonb (validated as strict hex colors app-side) rather than raw CSS/HTML —
-- profile pages are rendered to other visitors, so free-form markup would be a stored
-- XSS vector (this is exactly how the 2005 MySpace "Samy" worm spread).

alter table profiles add column theme jsonb;
