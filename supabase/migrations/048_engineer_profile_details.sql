-- Profile details an engineer writes about themselves: about text, location,
-- website, up to five links, and what kind of work they are open to.
-- Additive only. Existing rows get empty defaults.

alter table public.engineer_profiles
  add column if not exists bio text not null default '',
  add column if not exists location text not null default '',
  add column if not exists website text not null default '',
  add column if not exists links jsonb not null default '[]'::jsonb,
  add column if not exists open_to text not null default '';

alter table public.engineer_profiles
  drop constraint if exists engineer_profiles_bio_length,
  add constraint engineer_profiles_bio_length check (char_length(bio) <= 1200),
  drop constraint if exists engineer_profiles_location_length,
  add constraint engineer_profiles_location_length check (char_length(location) <= 80),
  drop constraint if exists engineer_profiles_website_shape,
  add constraint engineer_profiles_website_shape check (website = '' or (website ~ '^https://' and char_length(website) <= 200)),
  drop constraint if exists engineer_profiles_links_shape,
  add constraint engineer_profiles_links_shape check (jsonb_typeof(links) = 'array' and jsonb_array_length(links) <= 5),
  drop constraint if exists engineer_profiles_open_to,
  add constraint engineer_profiles_open_to check (open_to in ('', 'full_time', 'contract', 'either', 'not_looking'));
