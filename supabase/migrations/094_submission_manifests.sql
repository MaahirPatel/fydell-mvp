-- 094: submission manifests and client submission IDs (additive).
--
-- An authored submission now carries the stable ID the client generated for
-- it, a frozen manifest (file paths and content hashes, simulation version,
-- recorded event ranges, handoff and declared assistance hashes) and the
-- manifest's own hash. The analysis run records the manifest hash it must
-- evaluate, so a run can be tied to one exact snapshot. Columns are nullable:
-- submissions recorded before this migration have no manifest.

alter table public.eng_submissions
  add column if not exists client_submission_id text
    check (client_submission_id is null or client_submission_id ~ '^[A-Za-z0-9_-]{8,80}$'),
  add column if not exists manifest jsonb
    check (manifest is null or (jsonb_typeof(manifest) = 'object' and pg_column_size(manifest) <= 262144)),
  add column if not exists manifest_sha256 text
    check (manifest_sha256 is null or manifest_sha256 ~ '^[a-f0-9]{64}$');

alter table public.eng_submissions
  drop constraint if exists eng_submissions_manifest_pair;
alter table public.eng_submissions
  add constraint eng_submissions_manifest_pair check ((manifest is null) = (manifest_sha256 is null));

create unique index if not exists idx_eng_submissions_client_submission
  on public.eng_submissions (attempt_id, client_submission_id)
  where client_submission_id is not null;

alter table public.eng_evaluation_runs
  add column if not exists manifest_sha256 text
    check (manifest_sha256 is null or manifest_sha256 ~ '^[a-f0-9]{64}$');
