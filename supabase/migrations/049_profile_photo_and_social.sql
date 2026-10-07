-- Profile photo and social profiles on the engineering profile.
-- Additive only: new nullable columns, constraints and one storage bucket.

alter table public.engineer_profiles
  add column if not exists avatar_path text not null default '',
  add column if not exists linkedin_url text not null default '',
  add column if not exists x_url text not null default '',
  add column if not exists instagram_url text not null default '';

alter table public.engineer_profiles
  drop constraint if exists engineer_profiles_avatar_path_check,
  add constraint engineer_profiles_avatar_path_check
    check (avatar_path = '' or (char_length(avatar_path) <= 200 and avatar_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(png|jpg|webp)$'));

alter table public.engineer_profiles
  drop constraint if exists engineer_profiles_linkedin_url_check,
  add constraint engineer_profiles_linkedin_url_check
    check (linkedin_url = '' or (char_length(linkedin_url) <= 200 and linkedin_url ~ '^https://www\.linkedin\.com/(in|company)/'));

alter table public.engineer_profiles
  drop constraint if exists engineer_profiles_x_url_check,
  add constraint engineer_profiles_x_url_check
    check (x_url = '' or x_url ~ '^https://x\.com/[A-Za-z0-9_]{1,15}$');

alter table public.engineer_profiles
  drop constraint if exists engineer_profiles_instagram_url_check,
  add constraint engineer_profiles_instagram_url_check
    check (instagram_url = '' or instagram_url ~ '^https://www\.instagram\.com/[A-Za-z0-9._]{1,30}$');

-- Photos are written only by the server (service role) after type and size
-- checks; the bucket is public-read so a shared profile can show the photo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
