-- Throttling for the client app's sign-in (CALM_mobile odd/tasks/acceso-cliente-supabase.md, S7).
-- A 4-digit NIP is only 10,000 combinations, so the number of tries is what protects it.

create table public.sign_in_attempts (
  -- The 10-digit phone the client typed, whether or not it belongs to a client.
  phone text primary key check (phone ~ '^\d{10}$'),
  failures integer not null default 0 check (failures >= 0),
  -- Null while the phone is not locked out.
  locked_until timestamptz
);

-- Row level security on with no policy at all: only the service role reaches this table,
-- which is the Edge Function. Neither anon nor an authenticated client sees a single row.
alter table public.sign_in_attempts enable row level security;
