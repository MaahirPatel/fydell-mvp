-- An application's share link is created for that one application. When the
-- application row is removed, including by an organization being deleted,
-- the link stops working instead of outliving the employer it was sent to.

create or replace function public.revoke_application_share()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.share_id is not null then
    update public.passport_shares
       set revoked_at = now()
     where id = old.share_id
       and revoked_at is null;
  end if;
  return old;
end;
$$;

revoke all on function public.revoke_application_share() from public, anon, authenticated;

drop trigger if exists role_applications_revoke_share on public.role_applications;
create trigger role_applications_revoke_share
  before delete on public.role_applications
  for each row execute function public.revoke_application_share();
