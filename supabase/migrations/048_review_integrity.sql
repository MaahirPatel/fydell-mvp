-- Requirement review integrity. Additive only.
--
-- Mapping upserts conflict on the organization as well as role, share and
-- requirement, so one organization's assessment can never be addressed by
-- another's write even if a role id were reused or guessed.
create unique index if not exists requirement_evidence_mappings_org_scope
  on public.requirement_evidence_mappings (organization_id, role_id, share_id, requirement_index);
