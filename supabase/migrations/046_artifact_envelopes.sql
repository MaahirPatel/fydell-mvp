-- Artifact envelopes (§18).
--
-- A uniform envelope for any artifact: submission, receipt, report,
-- profile snapshot, or portable receipt. Each envelope records:
-- ID, kind, subject, org/application context, source/version,
-- content digest, acquisition time, permission classification,
-- retention state, and supersession.
--
-- This does not replace existing tables (eng_submissions etc.).
-- It wraps them with the §18 metadata for uniform handling.

create table if not exists public.artifact_envelopes (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in (
    'submission', 'receipt', 'report', 'profile_snapshot',
    'portable_receipt', 'finding', 'handoff'
  )),
  -- Human-readable subject: e.g. "Webhook retry fix — attempt 3f2a"
  subject text not null check (char_length(subject) between 1 and 200),
  -- Organization/application context when applicable.
  organization_id uuid references public.organizations(id) on delete set null,
  application_ref text,
  -- Source and version: which table/row this wraps.
  source_table text not null,
  source_id uuid not null,
  source_version text,
  -- Content digest (sha256 hex) for identity.
  content_digest text check (content_digest is null or content_digest ~ '^[a-f0-9]{64}$'),
  acquired_at timestamptz not null default now(),
  -- Permission classification.
  permission_class text not null default 'private'
    check (permission_class in ('private', 'shared', 'portable')),
  -- Retention state.
  retention_state text not null default 'active'
    check (retention_state in ('active', 'expired', 'deleted')),
  -- Supersession: points to the envelope that replaced this one.
  superseded_by uuid references public.artifact_envelopes(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (source_table, source_id)
);

create index if not exists idx_envelopes_org on public.artifact_envelopes (organization_id, acquired_at desc);
create index if not exists idx_envelopes_kind on public.artifact_envelopes (kind, acquired_at desc);

alter table public.artifact_envelopes enable row level security;

-- Owners see their own; org members see their org's.
create policy artifact_envelopes_read on public.artifact_envelopes
  for select
  using (
    created_by = auth.uid()
    or organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid()
    )
  );
