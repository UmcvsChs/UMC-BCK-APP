-- Store/company logo — separate from a person's own profile photo, since a
-- registered business's identity (its logo) is distinct from the individual
-- who registered it, and both matter for buyer trust/recognition.
alter table public.sellers add column logo_url text;

-- Cross-device dark mode preference — same pattern as language_preference,
-- which already existed. The toggle itself is 100% frontend; this just makes
-- the choice follow the user across devices instead of resetting each time.
alter table public.profiles add column theme_preference text not null default 'light' check (theme_preference in ('light', 'dark', 'system'));
