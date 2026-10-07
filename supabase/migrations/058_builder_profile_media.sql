-- Builder Profile media and the engineer's "How I build" statement.
-- Additive only.
--
-- Project images: one optional image per project presentation, stored in a
-- private bucket under the owner's id. Alt text is required whenever an image
-- is set. Images are only ever served through short-lived signed URLs minted
-- by the server after the share projection, so a private project's image is
-- never reachable from a share link.
alter table public.passport_project_presentations
  add column if not exists image_path text,
  add column if not exists image_alt text not null default '',
  add column if not exists image_updated_at timestamptz;

alter table public.passport_project_presentations
  drop constraint if exists passport_project_presentations_image_check;
alter table public.passport_project_presentations
  add constraint passport_project_presentations_image_check check (
    (image_path is null and image_alt = '')
    or (image_path is not null and char_length(image_path) between 3 and 300 and char_length(image_alt) between 1 and 200)
  );

-- "How I build": engineer-written, private by default. Only included in a
-- share when how_i_build_shared is true.
alter table public.engineer_profiles
  add column if not exists how_i_build text not null default '',
  add column if not exists how_i_build_shared boolean not null default false,
  add column if not exists how_i_build_updated_at timestamptz;

alter table public.engineer_profiles
  drop constraint if exists engineer_profiles_how_i_build_check;
alter table public.engineer_profiles
  add constraint engineer_profiles_how_i_build_check check (char_length(how_i_build) <= 1500);

-- Private bucket. No storage.objects policies are created, so only the service
-- role (and the short-lived signed URLs it mints) can read or write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('project-images', 'project-images', false, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;
