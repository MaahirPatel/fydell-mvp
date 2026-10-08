-- Simulation creator: keep the author's form input (including "Other" text)
-- with the draft, and record runner identity and section revisions with each
-- validation so stale results can be shown. Additive only.

alter table public.eng_scenario_drafts
  add column if not exists input jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'eng_scenario_drafts_input_shape') then
    alter table public.eng_scenario_drafts add constraint eng_scenario_drafts_input_shape
      check (jsonb_typeof(input) = 'object' and pg_column_size(input) <= 65536);
  end if;
end $$;

alter table public.eng_scenario_validations
  add column if not exists meta jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'eng_scenario_validations_meta_shape') then
    alter table public.eng_scenario_validations add constraint eng_scenario_validations_meta_shape
      check (jsonb_typeof(meta) = 'object' and pg_column_size(meta) <= 65536);
  end if;
end $$;

comment on column public.eng_scenario_versions.role_family is
  'Legacy evaluation-engine family from 028, constrained to backend_engineer. Authored versions record their engineering family in the family column.';

-- Published authored versions point back at their validation and approval.
create index if not exists idx_eng_scenario_versions_org_origin
  on public.eng_scenario_versions (organization_id, origin, created_at desc)
  where organization_id is not null;
