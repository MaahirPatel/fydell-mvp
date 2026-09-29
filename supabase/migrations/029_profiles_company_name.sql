-- Production's profiles table predates 001 and never received company_name,
-- which sign-up and role selection write. Without it the profile upsert fails
-- and the account is left without an account_type. Additive only.

alter table public.profiles add column if not exists company_name text;
