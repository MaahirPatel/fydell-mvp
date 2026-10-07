-- Engineers can add a project by uploading a ZIP instead of linking a public
-- GitHub repository. Uploaded snapshots have no hosted source to link to, so
-- the source kind is stored explicitly rather than inferred from the URL.
alter table public.passport_projects
  add column if not exists source_kind text not null default 'github';

do $$ begin
  alter table public.passport_projects
    add constraint passport_projects_source_kind_check check (source_kind in ('github', 'upload'));
exception when duplicate_object then null; end $$;
