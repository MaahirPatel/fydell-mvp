-- 088: make the commercial ledger and the audit log append-only in the
-- database, not only by convention.
--
-- billing_ledger_entries (034) is documented as append-only and audit_logs
-- (006) as append-only for app roles, but service_role still holds UPDATE,
-- DELETE and TRUNCATE on both, and anon/authenticated hold every privilege on
-- the ledger (RLS with no policies is the only thing stopping them). Admin
-- corrections append compensating entries; nothing in the application edits
-- or removes a row in either table.
--
-- Additive: no table, column or row is changed or removed.

create or replace function public.reject_append_only_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only; % is not allowed', tg_table_name, lower(tg_op)
    using errcode = '42501';
end;
$$;

revoke all on function public.reject_append_only_change() from public, anon, authenticated;

drop trigger if exists billing_ledger_entries_append_only on public.billing_ledger_entries;
create trigger billing_ledger_entries_append_only
  before update or delete on public.billing_ledger_entries
  for each row execute function public.reject_append_only_change();

drop trigger if exists billing_ledger_entries_no_truncate on public.billing_ledger_entries;
create trigger billing_ledger_entries_no_truncate
  before truncate on public.billing_ledger_entries
  for each statement execute function public.reject_append_only_change();

drop trigger if exists audit_logs_append_only on public.audit_logs;
create trigger audit_logs_append_only
  before update or delete on public.audit_logs
  for each row execute function public.reject_append_only_change();

drop trigger if exists audit_logs_no_truncate on public.audit_logs;
create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function public.reject_append_only_change();

-- Clients never touch the ledger; members read their billing row through the
-- existing organization_billing_member_read policy and nothing else.
revoke all on table public.billing_ledger_entries from anon, authenticated;
revoke insert, update, delete, truncate, references, trigger on table public.organization_billing from anon, authenticated;
revoke update, delete, truncate on table public.billing_ledger_entries from service_role;
revoke update, delete, truncate on table public.audit_logs from service_role;
