-- 012_fde_account_type_check_fix.sql
-- Migration 010 added profiles.account_type with check
-- ('platform','employer','candidate','unresolved'). Migration 011 tried to
-- widen it via `add column if not exists ... check (...)`, but since the
-- column already existed at that point, Postgres skips the whole clause
-- (including the check), so the old, narrower constraint stayed in force.
-- That silently blocks account_type in ('fde','partner','operator').
-- This migration replaces the constraint with the union of both sets.

alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in (
    'platform', 'employer', 'candidate', 'unresolved',
    'fde', 'partner', 'operator'
  ));
