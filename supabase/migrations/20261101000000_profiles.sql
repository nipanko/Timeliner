-- TIMELINER accounts, step 2: one profile per signed-in user.
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Security is enforced here, not in the app: every rule holds even against a modified app.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text check (char_length(nickname) between 1 and 30),
  birth_year int not null check (birth_year between 1900 and 2100),
  -- not_needed (adult) | pending (13-17, waiting for a parent) | granted (a parent confirmed)
  consent text not null default 'not_needed' check (consent in ('not_needed', 'pending', 'granted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Each user sees and creates only their own profile.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "create own profile" on public.profiles;
create policy "create own profile" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Users may change only their nickname. Birth year and consent are set by the server.
revoke update on public.profiles from authenticated, anon;
grant update (nickname) on public.profiles to authenticated;

-- The age rule (same as src/core/age.ts): only the birth year is known, so assume this year's
-- birthday is still ahead. Under 13: no account. 13-17: consent pending until a parent confirms.
create or replace function public.profiles_apply_age_rule() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  age int := extract(year from now())::int - new.birth_year - 1;
begin
  if age < 13 then
    raise exception 'TIMELINER accounts are for people aged 13 and over' using errcode = 'P0001';
  end if;
  new.consent := case when age < 18 then 'pending' else 'not_needed' end;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_age_rule on public.profiles;
create trigger profiles_age_rule before insert on public.profiles
  for each row execute function public.profiles_apply_age_rule();

create or replace function public.profiles_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.profiles_touch();
