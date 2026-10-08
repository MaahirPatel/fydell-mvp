-- Simulation creator: record when a reviewer opened the exact candidate
-- preview of a package, and publish an authored version atomically (version
-- row, protected evaluator material and draft update in one transaction).
-- Additive only.

create table if not exists public.eng_scenario_previews (
  id uuid primary key default gen_random_uuid(),
  draft_id uuid not null references public.eng_scenario_drafts(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  package_sha256 text not null check (package_sha256 ~ '^[0-9a-f]{64}$'),
  viewer_id uuid references auth.users(id) on delete set null,
  viewed_at timestamptz not null default now()
);
create index if not exists idx_eng_scenario_previews_draft on public.eng_scenario_previews (draft_id, package_sha256, viewer_id);

drop trigger if exists eng_scenario_previews_append_only on public.eng_scenario_previews;
create trigger eng_scenario_previews_append_only before update or delete on public.eng_scenario_previews
  for each row when (pg_trigger_depth() = 0) execute function public.eng_append_only_guard();

alter table public.eng_scenario_previews enable row level security;
alter table public.eng_scenario_previews force row level security;
revoke all on public.eng_scenario_previews from anon;
revoke insert, update, delete, truncate on public.eng_scenario_previews from authenticated;
drop policy if exists eng_scenario_previews_member_select on public.eng_scenario_previews;
create policy eng_scenario_previews_member_select on public.eng_scenario_previews
  for select to authenticated using (public.is_organization_member(organization_id));

create or replace function public.eng_publish_authored_version(
  p_draft_id uuid,
  p_expected_revision integer,
  p_version jsonb,
  p_protected jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  d public.eng_scenario_drafts%rowtype;
  v_id uuid;
begin
  select * into d from public.eng_scenario_drafts where id = p_draft_id for update;
  if not found then
    raise exception 'draft not found' using errcode = 'P0002';
  end if;
  if d.revision <> p_expected_revision then
    raise exception 'draft changed since approval' using errcode = '40001';
  end if;
  if d.status = 'archived' then
    raise exception 'draft is archived' using errcode = '22023';
  end if;

  insert into public.eng_scenario_versions (
    scenario_key, version, title, role_family, content, starter_sha256, harness_sha256,
    suite_version, rubric_version, review_record, status,
    organization_id, origin, draft_id, family, specialization, level, capabilities,
    purpose, package_sha256, validation_id, approval_id
  ) values (
    p_version->>'scenario_key',
    d.next_version,
    p_version->>'title',
    'backend_engineer',
    p_version->'content',
    p_version->>'starter_sha256',
    p_version->>'harness_sha256',
    p_version->>'suite_version',
    p_version->>'rubric_version',
    coalesce(p_version->'review_record', '{}'::jsonb),
    'published',
    d.organization_id,
    'employer_authored',
    d.id,
    d.family,
    d.specialization,
    d.level,
    coalesce(array(select jsonb_array_elements_text(p_version->'capabilities')), '{}'),
    'hiring',
    p_version->>'package_sha256',
    (p_version->>'validation_id')::uuid,
    (p_version->>'approval_id')::uuid
  ) returning id into v_id;

  insert into public.eng_scenario_version_protected (version_id, content) values (v_id, p_protected);

  update public.eng_scenario_drafts
     set status = 'published',
         published_version_id = v_id,
         next_version = d.next_version + 1,
         updated_at = now()
   where id = d.id;

  return v_id;
end $$;

revoke all on function public.eng_publish_authored_version(uuid, integer, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.eng_publish_authored_version(uuid, integer, jsonb, jsonb) to service_role;
