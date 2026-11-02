-- TIMELINER accounts, step 5: a parent's consent for 13-17 year olds (DPDP Act; decided 30 Oct).
-- Run after the earlier files. The request row is only reachable through these functions.
-- The confirm token is made and emailed by the Edge Function `send-consent-email` (service role),
-- so the teen's device never sees it and can't confirm for themselves.

create table if not exists public.consent_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  parent_email text not null check (char_length(parent_email) between 3 and 254),
  token uuid not null default gen_random_uuid() unique,
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  parent_name text check (char_length(parent_name) between 2 and 100)
);
alter table public.consent_requests enable row level security; -- no policies: no direct access for app users

-- The parent's link calls this (no sign-in needed; the token is the proof). Valid for 7 days, once.
create or replace function public.confirm_parent_consent(consent_token uuid, parent_name text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  req public.consent_requests;
begin
  if char_length(coalesce(trim(parent_name), '')) < 2 then
    raise exception 'Please type your full name' using errcode = '22023';
  end if;
  select * into req from public.consent_requests where token = consent_token;
  if req is null or req.confirmed_at is not null or req.requested_at < now() - interval '7 days' then
    raise exception 'This link has expired or was already used' using errcode = 'P0002';
  end if;
  update public.consent_requests set confirmed_at = now(), parent_name = trim(confirm_parent_consent.parent_name) where user_id = req.user_id;
  update public.profiles set consent = 'granted' where id = req.user_id and consent = 'pending';
end;
$$;

revoke all on function public.confirm_parent_consent(uuid, text) from public;
grant execute on function public.confirm_parent_consent(uuid, text) to anon, authenticated;
