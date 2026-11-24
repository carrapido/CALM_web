-- =====================================================================================
-- CALM — Esquema de la base de datos del panel de administración
-- =====================================================================================
-- Derivado de supabase/migrations/ (la fuente de verdad, aplicada en Supabase con
-- `supabase db push`). Este archivo reúne en un solo script el estado final de las tablas,
-- restricciones, índices y la función de administradora que usa el panel, para revisarlo o
-- crear la base en un Postgres vacío:
--
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/schema.sql
--
-- Diferencias con las migraciones:
--   * En un Postgres sin Supabase crea un esquema `auth` mínimo (auth.users y auth.uid());
--     en Supabase esos objetos ya existen y no se tocan.
--   * Deja RLS activado en todas las tablas, pero solo incluye la política que el panel
--     necesita para iniciar sesión ("An admin reads her own row"), y solo si existe el rol
--     `authenticated` de Supabase. De la app móvil solo trae las funciones que la API llama
--     (claim_nip_attempt, orphaned_auth_user_id, booking_calendar), sin permisos para
--     anon ni authenticated; sus políticas quedan en las migraciones.
--   * La API entra con el rol dueño de las tablas (postgres), que no aplica RLS: su guardia
--     es backend/src/middlewares/auth.middleware.ts.
--
-- Dinero en pesos enteros (MXN). Fechas y horas son de reloj de Cancún.
-- Las llaves foráneas no tienen cascada: un registro en uso no se borra, salvo los
-- servicios de una cita, que se van con ella.
-- =====================================================================================

begin;

-- -------------------------------------------------------------------------------------
-- 0. Compatibilidad con un Postgres sin Supabase
-- -------------------------------------------------------------------------------------
do $$
begin
  if to_regclass('auth.users') is null then
    create schema if not exists auth;
    create table auth.users (
      id uuid primary key,
      email text unique,
      -- Solo la llave de servicio lo escribe; orphaned_auth_user_id lee client_id de aquí.
      raw_app_meta_data jsonb
    );
  end if;

  -- Supabase lee el usuario de la sesión del JWT; aquí, del ajuste request.jwt.claim.sub.
  if to_regprocedure('auth.uid()') is null then
    create function auth.uid()
    returns uuid
    language sql
    stable
    as $fn$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
    $fn$;
  end if;
end
$$;

-- -------------------------------------------------------------------------------------
-- 1. Tablas
-- -------------------------------------------------------------------------------------

-- Las administradoras son usuarias de Supabase Auth; Supabase Auth guarda su contraseña.
create table public.admins (
  id uuid primary key references auth.users (id) on delete cascade
);

create table public.clients (
  id bigint generated always as identity primary key,
  name text not null check (btrim(name) <> ''),
  -- 10 dígitos. Una clienta de mostrador puede no dar celular.
  phone text check (phone ~ '^\d{10}$'),
  -- El NIP de 4 dígitos de la app, con hash argon2id hecho fuera de la base.
  nip_hash text,
  -- Su usuario de Supabase Auth cuando ya entró a la app; null para las de mostrador.
  user_id uuid references auth.users (id) on delete set null,
  -- Puede entrar a la app con su celular y NIP; así el panel no necesita leer nip_hash.
  has_app_access boolean generated always as (nip_hash is not null and phone is not null) stored,
  constraint clients_phone_key unique (phone),
  constraint clients_user_id_key unique (user_id),
  constraint signs_in_with_phone check (nip_hash is null or phone is not null),
  constraint account_has_phone_and_nip
    check (user_id is null or (phone is not null and nip_hash is not null))
);

create table public.services (
  id bigint generated always as identity primary key,
  name text not null check (btrim(name) <> ''),
  -- 'extra' es el cargo por prenda urgente, no un arreglo.
  category text not null check (category in ('arreglo', 'extra')),
  -- Null cuando el precio se cotiza en el local al ver la prenda.
  base_price_mxn integer check (base_price_mxn >= 0),
  -- 0 es el mismo día; el panel permite hasta 30.
  estimated_days integer not null check (estimated_days between 0 and 30),
  -- Solo los servicios activos llegan a la app de clientes.
  is_active boolean not null default true,
  constraint services_name_key unique (name)
);

create table public.appointments (
  id bigint generated always as identity primary key,
  client_id bigint not null references public.clients (id),
  -- El folio de 4 dígitos que la clienta muestra en el local; se repite entre fechas.
  ticket text not null check (ticket ~ '^\d{4}$'),
  scheduled_date date not null,
  -- Los espacios empiezan en punto o y media.
  scheduled_time time not null
    check (extract(minute from scheduled_time) in (0, 30) and extract(second from scheduled_time) = 0),
  -- Incluye el cargo por prenda urgente.
  preliminary_total_mxn integer not null check (preliminary_total_mxn >= 0),
  -- Una cita por espacio de 30 minutos.
  constraint appointments_scheduled_date_scheduled_time_key unique (scheduled_date, scheduled_time)
);

create table public.appointment_services (
  appointment_id bigint not null references public.appointments (id) on delete cascade,
  service_id bigint not null references public.services (id),
  primary key (appointment_id, service_id)
);

create table public.orders (
  id bigint generated always as identity primary key,
  client_id bigint not null references public.clients (id),
  -- Null para una clienta de mostrador; una cita origina a lo más un pedido.
  appointment_id bigint references public.appointments (id),
  ticket text not null check (ticket ~ '^\d{4}$'),
  work text not null check (btrim(work) <> ''),
  final_price_mxn integer not null check (final_price_mxn >= 0),
  delivery_date date not null,
  -- La clienta pone onTheWay a un pedido listo; delivered y cancelled lo terminan.
  status text not null default 'received'
    check (status in ('received', 'inProgress', 'ready', 'onTheWay', 'delivered', 'cancelled')),
  -- La API traduce este nombre a 409 appointment_has_order.
  constraint orders_appointment_id_key unique (appointment_id)
);

create table public.weekly_schedule (
  weekday text primary key
    check (weekday in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  -- Las dos en null en un día cerrado.
  opens_at time,
  closes_at time,
  updated_by uuid not null references public.admins (id),
  constraint opens_and_closes_together check ((opens_at is null) = (closes_at is null)),
  constraint closes_after_opening check (closes_at > opens_at)
);

-- Un día completo que la administradora cerró desde el panel.
create table public.blocked_dates (
  blocked_date date primary key,
  blocked_by uuid not null references public.admins (id)
);

-- Intentos de NIP de la app móvil; la API borra los de un celular al darle un NIP nuevo.
create table public.sign_in_attempts (
  phone text primary key check (phone ~ '^\d{10}$'),
  failures integer not null default 0 check (failures >= 0),
  -- Null mientras el celular no está bloqueado.
  locked_until timestamptz
);

-- -------------------------------------------------------------------------------------
-- 2. Índices
-- -------------------------------------------------------------------------------------
create index appointments_client_id_idx on public.appointments (client_id);
-- La llave primaria ya sirve las búsquedas por appointment_id.
create index appointment_services_service_id_idx on public.appointment_services (service_id);
create index orders_client_id_idx on public.orders (client_id);
-- Un folio queda libre otra vez cuando su pedido se entrega o se cancela.
-- La API traduce este nombre a 409 ticket_taken.
create unique index orders_active_ticket_key on public.orders (ticket)
  where status not in ('delivered', 'cancelled');
create index weekly_schedule_updated_by_idx on public.weekly_schedule (updated_by);
create index blocked_dates_blocked_by_idx on public.blocked_dates (blocked_by);

-- -------------------------------------------------------------------------------------
-- 3. Regla de acceso: ¿la sesión es de una administradora?
-- -------------------------------------------------------------------------------------
-- En un esquema que la Data API de Supabase no expone. Corre como su dueño para que las
-- políticas puedan leer admins sin que la política de esa tabla estorbe.
create schema if not exists private;

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

-- -------------------------------------------------------------------------------------
-- 4. Row level security
-- -------------------------------------------------------------------------------------
alter table public.admins enable row level security;
alter table public.clients enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_services enable row level security;
alter table public.orders enable row level security;
alter table public.weekly_schedule enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.sign_in_attempts enable row level security;

-- Solo en Supabase: el panel confirma al iniciar sesión que la usuaria está en admins.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant usage on schema private to authenticated;
    grant execute on function private.is_admin() to authenticated;
    create policy "An admin reads her own row" on public.admins
      for select to authenticated
      using (id = (select auth.uid()));
  end if;
end
$$;

-- -------------------------------------------------------------------------------------
-- 5. Funciones de la app móvil que llama la API (backend/src/repositories/client-app.repository.ts)
-- -------------------------------------------------------------------------------------

-- Cuenta una revisión de NIP contra el celular antes de hacerla: cinco por celular hasta que
-- un NIP correcto las borra; la quinta bloquea quince minutos. Una sola sentencia que bloquea
-- la fila del celular, para que intentos simultáneos no se salten la cuenta.
create function public.claim_nip_attempt(p_phone text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  claimed integer;
begin
  insert into public.sign_in_attempts as attempt (phone, failures, locked_until)
  values (p_phone, 1, null)
  on conflict (phone) do update set
    failures = case
      when attempt.locked_until <= now() then 1
      else attempt.failures + 1
    end,
    locked_until = case
      when attempt.locked_until <= now() then null
      when attempt.locked_until is null and attempt.failures + 1 >= 5
        then now() + interval '15 minutes'
      else attempt.locked_until
    end
  returning failures into claimed;
  return claimed <= 5;
end;
$$;

-- El usuario de Auth que una petición anterior creó para esta misma clienta y no alcanzó a
-- ligar; solo si su app_metadata dice que es de ella y ningún cliente lo tiene.
create function public.orphaned_auth_user_id(p_email text, p_client_id bigint)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.id
    from auth.users u
   where u.email = lower(p_email)
     and u.raw_app_meta_data ->> 'client_id' = p_client_id::text
     and not exists (select 1 from public.clients c where c.user_id = u.id);
$$;

-- Lo que la app necesita para agendar este mes y el siguiente: horario, días bloqueados y
-- espacios ocupados (sin decir de quién), con "hoy" y "ahora" en el reloj de Cancún.
create function public.booking_calendar()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with clock as (
    select (now() at time zone 'America/Cancun') as moment
  ),
  bounds as (
    select
      moment::date as today,
      moment::time as now_time,
      -- El primer día después del mes siguiente.
      (date_trunc('month', moment) + interval '2 months')::date as horizon
    from clock
  )
  select jsonb_build_object(
    'today', b.today,
    'now', to_char(b.now_time, 'HH24:MI'),
    'weekly', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'weekday', w.weekday,
        'opens_at', to_char(w.opens_at, 'HH24:MI'),
        'closes_at', to_char(w.closes_at, 'HH24:MI')
      )), '[]'::jsonb)
      from public.weekly_schedule w
    ),
    'blocked', (
      select coalesce(jsonb_agg(d.blocked_date order by d.blocked_date), '[]'::jsonb)
      from public.blocked_dates d
      where d.blocked_date >= b.today and d.blocked_date < b.horizon
    ),
    'booked', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', a.scheduled_date,
        'time', to_char(a.scheduled_time, 'HH24:MI')
      ) order by a.scheduled_date, a.scheduled_time), '[]'::jsonb)
      from public.appointments a
      where a.scheduled_date >= b.today and a.scheduled_date < b.horizon
    )
  )
  from bounds b;
$$;

-- Solo la API, que entra como dueña de las funciones, las llama.
revoke execute on function public.claim_nip_attempt(text) from public;
revoke execute on function public.orphaned_auth_user_id(text, bigint) from public;
revoke execute on function public.booking_calendar() from public;

commit;
