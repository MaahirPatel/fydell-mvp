-- §10 claim metadata for manual projects.
--
-- Each claim needs: subject, precise statement, claim category, source
-- references, version, method, checked date, limitations, review state,
-- and freshness/dispute status. Manual projects had the basics; this
-- adds the missing metadata.

alter table public.passport_manual_projects
  add column if not exists claim_category text not null default 'candidate_stated'
    check (claim_category in ('candidate_stated')),
  add column if not exists method text not null default 'self_report'
    check (method in ('self_report')),
  add column if not exists checked_at timestamptz not null default now(),
  add column if not exists limitations text not null default
    'Self-reported. Not verified against source code, employer records, or independent observation.'
    check (char_length(limitations) <= 500),
  add column if not exists review_state text not null default 'published'
    check (review_state in ('draft', 'published', 'disputed')),
  add column if not exists freshness_status text not null default 'current'
    check (freshness_status in ('current', 'stale')),
  add column if not exists version integer not null default 1 check (version > 0);

-- Dispute support: review_state='disputed' preserves the claim while
-- flagging it. Corrections create a new version, not a silent rewrite.
create index if not exists idx_manual_projects_review
  on public.passport_manual_projects (passport_id, review_state);

-- Atomic version bump for corrections (§10).
-- Corrections create a new version, not a silent rewrite.
-- SECURITY: verifies the caller owns the project via passport ownership
-- before bumping. Without this check, any authenticated user could bump
-- any project's version (fixed 2026-10-05).
create or replace function public.bump_manual_project_version(project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_owner boolean;
begin
  select exists (
    select 1
    from public.passport_manual_projects pmp
    join public.passports p on p.id = pmp.passport_id
    where pmp.id = project_id
      and p.owner_id = auth.uid()
  ) into caller_is_owner;

  if not caller_is_owner then
    raise exception 'Not authorized to modify this project'
      using errcode = '42501'; -- insufficient_privilege
  end if;

  update public.passport_manual_projects
  set version = version + 1,
      updated_at = now()
  where id = project_id;
end;
$$;

revoke all on function public.bump_manual_project_version(uuid) from public;
grant execute on function public.bump_manual_project_version(uuid) to authenticated, service_role;
