-- CALM's first schema, from the ER diagram CALM_BD.drawio.
-- Money is whole Mexican pesos and times are Cancún wall-clock times, as in the app.
-- Foreign keys keep Postgres's default (no action): a row in use cannot be deleted,
-- except an appointment's services, which go with it.

create table public.admins (
  id bigint generated always as identity primary key,
  -- argon2id, hashed outside the database; never the password itself.
  password_hash text not null
);

create table public.clients (
  id bigint generated always as identity primary key,
  name text not null check (btrim(name) <> ''),
  -- 10-digit Mexican number. A walk-in client may leave none.
  phone text unique check (phone ~ '^\d{10}$'),
  -- The 4-digit app NIP, hashed with argon2id outside the database.
  nip_hash text,
  constraint signs_in_with_phone check (nip_hash is null or phone is not null)
);

create table public.services (
  id bigint generated always as identity primary key,
  name text not null unique check (btrim(name) <> ''),
  -- 'extra' is the urgent-garment charge ("Prenda urgente"), not a repair.
  category text not null check (category in ('arreglo', 'extra')),
  -- Null when the price is quoted in the shop after seeing the garment.
  base_price_mxn integer check (base_price_mxn >= 0),
  -- 0 is the same day; the panel allows up to 30.
  estimated_days integer not null check (estimated_days between 0 and 30),
  -- Only active services reach the client app.
  is_active boolean not null default true
);

create table public.appointments (
  id bigint generated always as identity primary key,
  client_id bigint not null references public.clients (id),
  -- The 4-digit folio the client shows in the shop.
  ticket text not null check (ticket ~ '^\d{4}$'),
  scheduled_date date not null,
  -- Slots start on the hour or the half hour.
  scheduled_time time not null
    check (extract(minute from scheduled_time) in (0, 30) and extract(second from scheduled_time) = 0),
  -- Includes the urgent-garment charge.
  preliminary_total_mxn integer not null check (preliminary_total_mxn >= 0),
  -- One appointment per 30-minute slot.
  unique (scheduled_date, scheduled_time)
);

create index appointments_client_id_idx on public.appointments (client_id);

create table public.appointment_services (
  appointment_id bigint not null references public.appointments (id) on delete cascade,
  service_id bigint not null references public.services (id),
  primary key (appointment_id, service_id)
);

-- The primary key already serves lookups by appointment_id.
create index appointment_services_service_id_idx on public.appointment_services (service_id);

create table public.orders (
  id bigint generated always as identity primary key,
  client_id bigint not null references public.clients (id),
  -- Null for a walk-in client; an appointment leads to one order at most.
  appointment_id bigint unique references public.appointments (id),
  ticket text not null check (ticket ~ '^\d{4}$'),
  work text not null check (btrim(work) <> ''),
  final_price_mxn integer not null check (final_price_mxn >= 0),
  delivery_date date not null,
  -- The client sets onTheWay on a ready order; delivered and cancelled end it.
  status text not null default 'received'
    check (status in ('received', 'inProgress', 'ready', 'onTheWay', 'delivered', 'cancelled'))
);

create index orders_client_id_idx on public.orders (client_id);

-- A ticket is free again once its order is delivered or cancelled.
create unique index orders_active_ticket_key on public.orders (ticket)
  where status not in ('delivered', 'cancelled');

create table public.weekly_schedule (
  weekday text primary key
    check (weekday in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  -- Both null on a closed day.
  opens_at time,
  closes_at time,
  updated_by bigint not null references public.admins (id),
  constraint opens_and_closes_together check ((opens_at is null) = (closes_at is null)),
  constraint closes_after_opening check (closes_at > opens_at)
);

create index weekly_schedule_updated_by_idx on public.weekly_schedule (updated_by);

-- A whole day the admin closed from the panel.
create table public.blocked_dates (
  blocked_date date primary key,
  blocked_by bigint not null references public.admins (id)
);

create index blocked_dates_blocked_by_idx on public.blocked_dates (blocked_by);

-- The Data API exposes the public schema. With row level security on and no policies yet,
-- only the service role reaches these tables; policies come when the app connects.
alter table public.admins enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.orders enable row level security;
alter table public.weekly_schedule enable row level security;
alter table public.blocked_dates enable row level security;
