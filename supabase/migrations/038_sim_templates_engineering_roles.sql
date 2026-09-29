-- 038: allow engineering role keys on simulation templates.
--
-- The desktop engineering simulation (`webhook-retry-incident`) is authored
-- with role_key 'backend_engineer', which 019's check constraint predates.
-- This only widens the allowed set to match RoleKey in
-- src/lib/simulations/types.ts; no existing row changes.

alter table public.sim_templates
  drop constraint if exists sim_templates_role_key_check;

alter table public.sim_templates
  add constraint sim_templates_role_key_check check (role_key in (
    'backend_engineer',
    'applied_ai_engineer',
    'data_analyst',
    'bi_analyst',
    'solutions_engineer',
    'implementation_consultant',
    'technical_support_engineer',
    'business_systems_analyst'
  ));
