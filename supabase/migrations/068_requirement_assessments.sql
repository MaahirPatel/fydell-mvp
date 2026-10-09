-- A reviewer's judgment of one requirement against the applicant's evidence.
-- Additive: existing mappings keep their status and have no assessment.
alter table public.requirement_evidence_mappings
  add column if not exists assessment text
    check (assessment is null or assessment in ('supports', 'insufficient', 'not_observed', 'concern'));
