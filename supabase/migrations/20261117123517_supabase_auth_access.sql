-- Admins and app clients sign in through Supabase Auth (odd/tasks/acceso-supabase.md).
-- The tables are still empty, so key columns are dropped and added again with their new type.

-- Admins are Supabase Auth users: the id is theirs, and Supabase Auth keeps the password hash.
alter table public.weekly_schedule drop column updated_by;
alter table public.blocked_dates drop column blocked_by;
drop table public.admins;

create table public.admins (
  id uuid primary key references auth.users (id) on delete cascade
);

alter table public.weekly_schedule add column updated_by uuid not null references public.admins (id);
create index weekly_schedule_updated_by_idx on public.weekly_schedule (updated_by);

alter table public.blocked_dates add column blocked_by uuid not null references public.admins (id);
create index blocked_dates_blocked_by_idx on public.blocked_dates (blocked_by);

-- A client who signs in to the app has a Supabase Auth user; a walk-in client has none.
alter table public.clients
  add column user_id uuid unique references auth.users (id) on delete set null,
  add constraint account_has_phone_and_nip
    check (user_id is null or (phone is not null and nip_hash is not null));

-- The access rule, in a schema the Data API does not expose. It runs as its owner so that
-- policies can read admins without that table's own policy in the way.
create schema private;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where id = (select auth.uid()));
$$;

revoke execute on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.admins enable row level security;

create policy "An admin reads her own row" on public.admins
  for select to authenticated
  using (id = (select auth.uid()));

-- Policies wrap the function in a select, so Postgres runs it once per query, not per row.
create policy "The admin manages clients" on public.clients
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "The admin manages services" on public.services
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "The admin manages appointments" on public.appointments
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "The admin manages appointment services" on public.appointment_services
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "The admin manages orders" on public.orders
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "The admin manages the weekly schedule" on public.weekly_schedule
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "The admin manages blocked dates" on public.blocked_dates
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
