-- 053: Public role pages and applications.
--
-- A hiring_roles row becomes a shareable role page once the employer confirms
-- it is a genuine open position. Applicants submit a private application that
-- shares selected Passport projects through a pinned share link. Additive only.

alter table public.hiring_roles
  add column if not exists public_slug text,
  add column if not exists preferred_criteria text[] not null default '{}',
  add column if not exists remote_policy text,
  add column if not exists compensation text,
  add column if not exists hiring_steps text[] not null default '{}',
  add column if not exists expected_effort text,
  add column if not exists application_deadline date,
  add column if not exists contact_email text,
  add column if not exists published_at timestamptz,
  add column if not exists genuine_confirmed_at timestamptz,
  add column if not exists genuine_confirmed_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'hiring_roles_public_slug_shape') then
    alter table public.hiring_roles
      add constraint hiring_roles_public_slug_shape check (public_slug is null or public_slug ~ '^[a-z0-9][a-z0-9-]{4,79}$');
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hiring_roles_remote_policy_check') then
    alter table public.hiring_roles
      add constraint hiring_roles_remote_policy_check check (remote_policy is null or remote_policy in ('onsite', 'hybrid', 'remote'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'hiring_roles_public_text_limits') then
    alter table public.hiring_roles
      add constraint hiring_roles_public_text_limits check (
        (compensation is null or char_length(compensation) <= 200)
        and (expected_effort is null or char_length(expected_effort) <= 200)
        and (contact_email is null or char_length(contact_email) <= 254)
      );
  end if;
end $$;

create unique index if not exists idx_hiring_roles_public_slug
  on public.hiring_roles (public_slug) where public_slug is not null;

create table if not exists public.role_applications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role_id uuid not null references public.hiring_roles(id) on delete restrict,
  applicant_user_id uuid not null references auth.users(id) on delete cascade,
  contact_name text not null check (char_length(contact_name) between 1 and 120),
  contact_email text not null check (contact_email = lower(contact_email) and char_length(contact_email) <= 254),
  share_id uuid references public.passport_shares(id) on delete set null,
  review_id uuid references public.employer_passport_reviews(id) on delete set null,
  links jsonb not null default '[]'::jsonb,
  note text not null default '' check (char_length(note) <= 2000),
  role_snapshot jsonb not null,
  status text not null default 'submitted' check (status in ('submitted', 'withdrawn')),
  stage text not null default 'new' check (stage in ('new', 'in_review', 'awaiting_candidate', 'closed')),
  assigned_reviewer uuid references auth.users(id) on delete set null,
  submitted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  updated_at timestamptz not null default now()
);

-- One active application per person per role; re-applying after withdrawal is allowed.
create unique index if not exists idx_role_applications_one_active
  on public.role_applications (role_id, applicant_user_id) where status = 'submitted';
create index if not exists idx_role_applications_role
  on public.role_applications (organization_id, role_id, submitted_at desc);
create index if not exists idx_role_applications_applicant
  on public.role_applications (applicant_user_id, submitted_at desc);

alter table public.role_applications enable row level security;

drop policy if exists role_applications_applicant_read on public.role_applications;
create policy role_applications_applicant_read on public.role_applications
  for select using (applicant_user_id = auth.uid());

drop policy if exists role_applications_org_read on public.role_applications;
create policy role_applications_org_read on public.role_applications
  for select using (
    organization_id in (
      select organization_id from public.organization_members
      where user_id = auth.uid() and status = 'active'
    )
  );

revoke insert, update, delete on public.role_applications from anon, authenticated;

alter table public.user_notifications drop constraint if exists user_notifications_kind_check;
alter table public.user_notifications
  add constraint user_notifications_kind_check
  check (kind in ('invitation_received', 'question_received', 'question_answered', 'application_received'));
