-- ============================================================================
-- Org/member RLS helpers (authenticated path). Service-role remains primary for admin ops.
-- ============================================================================

create or replace function public.is_organization_member(org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.has_organization_role(org_id uuid, role_names text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = org_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and m.role = any(role_names)
  );
$$;

revoke all on function public.is_organization_member(uuid) from public;
revoke all on function public.has_organization_role(uuid, text[]) from public;
grant execute on function public.is_organization_member(uuid) to authenticated, service_role;
grant execute on function public.has_organization_role(uuid, text[]) to authenticated, service_role;

-- Organizations: members can read their orgs; platform admins via service role / is_platform_admin
drop policy if exists organizations_select_member on public.organizations;
create policy organizations_select_member on public.organizations
  for select to authenticated
  using (
    public.is_organization_member(id)
    or public.is_platform_admin()
    or owner_id = auth.uid()
  );

drop policy if exists organization_members_select_own_org on public.organization_members;
create policy organization_members_select_own_org on public.organization_members
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_organization_member(organization_id)
    or public.is_platform_admin()
  );

-- Suspended profiles cannot be treated as active org members in app queries
comment on function public.is_organization_member(uuid) is
  'SECURITY DEFINER: checks active organization membership for auth.uid()';
