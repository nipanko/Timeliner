-- TIMELINER accounts, step 4: Delete account (both app stores require it inside the app).
-- Run after the earlier files (SQL Editor -> New query -> Run).
-- Deleting the sign-in removes, by cascade, the profile, every synced row and any consent request.

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = (select auth.uid());
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
