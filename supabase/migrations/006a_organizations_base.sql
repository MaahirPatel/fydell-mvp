-- ============================================================================
-- 006a_organizations_base.sql
--
-- Creates public.organizations so the numbered migration chain can be applied
-- to an empty database.
--
-- Why this file exists
-- --------------------
-- Migration 007 opens with `alter table public.organizations add column ...`
-- and its header says it "extends existing public.organizations". Nothing in
-- 001 through 006 ever creates that table. It was only ever defined in
-- supabase/schema.sql, a hand-applied base schema that its own header says to
-- paste into the SQL editor, and which warns against running it alongside
-- 001_mvp_core.sql because the two model profiles, candidate_invites,
-- simulation_attempts and simulation_events differently.
--
-- The practical effect was that the migrations directory could only be applied
-- to a database that had already been hand-prepared. Applying 001 through 006
-- to a fresh project succeeds and 007 then fails with
-- `relation "public.organizations" does not exist`, which is exactly what
-- happened on the development project. Nine later migrations (007, 009, 010,
-- 011, 013, 014, 018, 019, 021) reference the table.
--
-- Scope
-- -----
-- Only the organizations table is lifted out of schema.sql, because it is the
-- only object from that file the numbered chain depends on. Nothing in 007
-- through 021 references pilots, evidence_reports, hiring_decisions,
-- chat_messages, activity_log, or the current_org_id / current_email /
-- is_company_user helpers. The conflicting table definitions are deliberately
-- left where they are; this file does not attempt to reconcile them.
--
-- The column list is the base shape from schema.sql exactly as written. Every
-- other column the application uses (slug, website, status, pilot_stage,
-- industry, company_size, billing_email, timezone, created_by,
-- created_from_pilot_request_id) is added by 007, and pilot_stage is further
-- constrained by 010. Those are left to those migrations rather than
-- duplicated here, so there is one owner per column.
--
-- Safety on an existing database
-- ------------------------------
-- `create table if not exists` makes this a no-op anywhere organizations is
-- already present, which includes production. It adds no column, drops
-- nothing, changes no constraint and moves no data. RLS and policies are left
-- to 009, which is where the organization isolation helpers live, so this file
-- does not grant any read that 009 would not.
--
-- Rollback
-- --------
-- None is provided, and dropping the table would destroy every tenant. If this
-- file needs to be undone on a database where it genuinely created the table,
-- that database is empty by definition and should be recreated instead.
-- ============================================================================

create table if not exists public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid references auth.users (id) on delete set null,
  owner_email text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- set_updated_at() is created by 001_mvp_core.sql, so it is available here.
drop trigger if exists trg_organizations_updated on public.organizations;
create trigger trg_organizations_updated before update on public.organizations
  for each row execute function public.set_updated_at();
