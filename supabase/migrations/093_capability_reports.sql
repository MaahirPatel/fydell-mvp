-- 093: Capability reports with separate evidence layers.
--
-- Additive only.
--
-- A project report keeps six layers apart: what the snapshot contains,
-- what connects a change to the engineer, task demonstrations, the
-- engineer's statements, reviewer judgment, and the bounded synthesis.
--
-- passport_projects gains the contribution signals captured at import
-- (connected login, repository owner, fork, commits on cited paths) and the
-- analysis checks (comment contradictions, rejected claims, ignored
-- README instructions). passport_evidence gains the entailment result for
-- each finding. passport_contributions gains the engineer's stated
-- relationship to the project, stored apart from evidence strength.
--
-- passport_capability_reports holds immutable report versions per snapshot.
-- Re-analysis appends a new version with a reason; identical inputs never
-- produce a second version. Rows are only removed with their snapshot.

alter table public.passport_projects
  add column if not exists contribution_signals jsonb check (contribution_signals is null or jsonb_typeof(contribution_signals) = 'object'),
  add column if not exists analysis_checks jsonb check (analysis_checks is null or jsonb_typeof(analysis_checks) = 'object');

alter table public.passport_evidence
  add column if not exists entailment jsonb check (entailment is null or jsonb_typeof(entailment) = 'object');

alter table public.passport_contributions
  add column if not exists relationship text not null default 'unspecified'
    check (relationship in ('unspecified', 'maintained', 'contributor', 'team_project', 'fork', 'learning_exercise', 'reference'));

create table if not exists public.passport_capability_reports (
  id uuid primary key default gen_random_uuid(),
  passport_id uuid not null references public.passports(id) on delete cascade,
  snapshot_id uuid not null references public.passport_projects(id) on delete cascade,
  version integer not null check (version >= 1),
  reason text not null check (char_length(reason) between 1 and 300),
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  schema_version text not null,
  analysis_version text,
  report jsonb not null check (jsonb_typeof(report) = 'object'),
  report_hash text not null check (report_hash ~ '^[0-9a-f]{64}$'),
  supersedes_id uuid references public.passport_capability_reports(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (snapshot_id, version),
  unique (snapshot_id, input_hash)
);
create index if not exists idx_passport_capability_reports_snapshot on public.passport_capability_reports (snapshot_id, version desc);
create index if not exists idx_passport_capability_reports_passport on public.passport_capability_reports (passport_id, created_at desc);

create or replace function public.passport_capability_reports_immutable()
returns trigger language plpgsql set search_path = public as $$
begin
  -- Only the supersedes pointer may be cleared, by the cascade when an older version is removed with its snapshot.
  if new.id = old.id and new.passport_id = old.passport_id and new.snapshot_id = old.snapshot_id
     and new.version = old.version and new.reason = old.reason and new.input_hash = old.input_hash
     and new.report_hash = old.report_hash and new.report = old.report and new.supersedes_id is null then
    return new;
  end if;
  raise exception 'capability reports are immutable';
end $$;

drop trigger if exists passport_capability_reports_no_update on public.passport_capability_reports;
create trigger passport_capability_reports_no_update before update on public.passport_capability_reports
  for each row execute function public.passport_capability_reports_immutable();

alter table public.passport_capability_reports enable row level security;
alter table public.passport_capability_reports force row level security;
revoke all on public.passport_capability_reports from anon;
revoke insert, update, delete, truncate on public.passport_capability_reports from authenticated;
grant select on public.passport_capability_reports to authenticated;

drop policy if exists passport_capability_reports_owner_read on public.passport_capability_reports;
create policy passport_capability_reports_owner_read on public.passport_capability_reports
  for select to authenticated
  using (exists (select 1 from public.passports p where p.id = passport_id and p.owner_id = auth.uid()));

revoke execute on function public.passport_capability_reports_immutable() from public, anon, authenticated;
