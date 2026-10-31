-- TIMELINER sync, step 3. Run after 20261101000000_profiles.sql (SQL Editor -> New query -> Run).
-- One generic table holds every synced row as JSON, so new app tables need no server change.
-- Rules (same as src/core/sync.ts): newest updatedAt wins; pulling follows a server sequence, not device clocks.

create sequence if not exists public.sync_seq;

create table if not exists public.sync_rows (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tbl text not null check (tbl in ('layers', 'entries', 'focus_sessions', 'day_logs', 'milestones', 'settings', 'inbox')),
  row_key text not null check (char_length(row_key) between 1 and 100),
  data jsonb not null check (pg_column_size(data) < 20000),
  updated_at bigint not null,
  seq bigint not null default nextval('public.sync_seq'),
  primary key (user_id, tbl, row_key)
);
create index if not exists sync_rows_user_seq on public.sync_rows (user_id, seq);

alter table public.sync_rows enable row level security;

-- Signed in, profile created, and not a 13-17 account still waiting for a parent.
create or replace function public.can_sync() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and consent <> 'pending');
$$;

-- Reading: only your own rows. Writing: only through push_rows below (no direct insert / update / delete).
drop policy if exists "read own rows" on public.sync_rows;
create policy "read own rows" on public.sync_rows for select to authenticated using (user_id = (select auth.uid()) and public.can_sync());
revoke insert, update, delete on public.sync_rows from authenticated, anon;

-- Upload: keeps a row only if it is strictly newer than the stored one, and gives it a new sequence number.
create or replace function public.push_rows(rows jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.can_sync() then
    raise exception 'sync is not allowed for this account yet' using errcode = '42501';
  end if;
  if jsonb_typeof(rows) <> 'array' or jsonb_array_length(rows) > 500 then
    raise exception 'push_rows takes a list of at most 500 rows' using errcode = '22023';
  end if;
  insert into public.sync_rows as s (user_id, tbl, row_key, data, updated_at)
  select (select auth.uid()), r ->> 'table', r ->> 'key', r -> 'data', (r ->> 'updatedAt')::bigint
  from jsonb_array_elements(rows) as r
  on conflict (user_id, tbl, row_key) do update
    set data = excluded.data, updated_at = excluded.updated_at, seq = nextval('public.sync_seq')
    where excluded.updated_at > s.updated_at;
end;
$$;

revoke all on function public.push_rows(jsonb) from public, anon;
grant execute on function public.push_rows(jsonb) to authenticated;
revoke all on function public.can_sync() from public, anon;
grant execute on function public.can_sync() to authenticated;
