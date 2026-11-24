-- =====================================================================================
-- CALM — Datos de prueba del panel de administración
-- =====================================================================================
-- Para una base recién creada con database/schema.sql (o con supabase/migrations/) y con
-- las tablas vacías. Todos los datos son inventados: nombres comunes y celulares
-- 998000000X que no son de nadie.
--
-- ANTES: crea una administradora. El seed la usa como autora del horario y del día
-- bloqueado, y se detiene con un aviso si no hay ninguna.
--
--   En Supabase:
--     1. Authentication → Users → Add user → correo <celular>@panel.calm.invalid (por
--        ejemplo 9980000000@panel.calm.invalid) y una contraseña. El panel pide ese
--        celular (10 dígitos) y esa contraseña.
--     2. SQL Editor:
--          insert into public.admins (id)
--          select id from auth.users where email = '9980000000@panel.calm.invalid';
--
--   En un Postgres sin Supabase (solo para revisar el esquema y las consultas; para
--   iniciar sesión en el panel hace falta Supabase Auth):
--          insert into auth.users (id, email)
--          values ('00000000-0000-4000-8000-000000000001', '9980000000@panel.calm.invalid');
--          insert into public.admins (id)
--          values ('00000000-0000-4000-8000-000000000001');
--
-- DESPUÉS:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f database/seed.sql
--
-- Las citas, el día bloqueado y las entregas se fechan a partir de hoy (current_date),
-- para que la Agenda tenga algo que mostrar el día de la demostración. Ids y folios son fijos.
-- =====================================================================================

begin;

do $$
begin
  if not exists (select 1 from public.admins) then
    raise exception 'No hay administradoras. Crea una antes de correr el seed (ver el encabezado de database/seed.sql).';
  end if;
end
$$;

-- -------------------------------------------------------------------------------------
-- Catálogo: con precio base, «se cotiza en el local» (null), uno inactivo y el cargo urgente.
-- -------------------------------------------------------------------------------------
insert into public.services (id, name, category, base_price_mxn, estimated_days, is_active)
overriding system value
values
  (1, 'Dobladillo de pantalón',      'arreglo',   80,  2, true),
  (2, 'Cambio de cierre',            'arreglo',  120,  3, true),
  (3, 'Parche',                      'arreglo',   40,  0, true),
  (4, 'Ajuste de cintura',           'arreglo',  150,  4, true),
  (5, 'Arreglo de vestido de novia', 'arreglo', null, 15, true),
  (6, 'Bastilla de cortina',         'arreglo',  100,  5, false),
  (7, 'Prenda urgente',              'extra',    100,  0, true);

-- -------------------------------------------------------------------------------------
-- Clientes. Ana tiene acceso a la app con el NIP de prueba 1234 (hash argon2id con los
-- parámetros de backend/src/utils/nip.ts). Carmen es de mostrador y no dejó celular.
-- -------------------------------------------------------------------------------------
insert into public.clients (id, name, phone, nip_hash)
overriding system value
values
  (1, 'Ana López',    '9980000001',
      '$argon2id$v=19$m=19456,t=2,p=1$AQIDBAUGBwgJCgsMDQ4PEA$nktjF+E2PWwprhl6qG9dnTeIj0c3WSWS/aEyH3DBrgM'),
  (2, 'Rosa Pérez',   '9980000002', null),
  (3, 'Lucía Méndez', '9980000003', null),
  (4, 'Carmen Díaz',  null,         null),
  (5, 'Marta Ruiz',   '9980000005', null),
  (6, 'Sofía Gómez',  '9980000006', null);

-- -------------------------------------------------------------------------------------
-- Horario: lunes a viernes de 9 a 18, sábado de 10 a 14, domingo cerrado.
-- -------------------------------------------------------------------------------------
insert into public.weekly_schedule (weekday, opens_at, closes_at, updated_by)
select weekday, opens_at::time, closes_at::time, (select id from public.admins order by id limit 1)
from (values
  ('monday',    '09:00', '18:00'),
  ('tuesday',   '09:00', '18:00'),
  ('wednesday', '09:00', '18:00'),
  ('thursday',  '09:00', '18:00'),
  ('friday',    '09:00', '18:00'),
  ('saturday',  '10:00', '14:00'),
  ('sunday',    null,    null)
) as week (weekday, opens_at, closes_at);

-- -------------------------------------------------------------------------------------
-- Un día bloqueado, dentro de la semana siguiente.
-- -------------------------------------------------------------------------------------
insert into public.blocked_dates (blocked_date, blocked_by)
values (current_date + 6, (select id from public.admins order by id limit 1));

-- -------------------------------------------------------------------------------------
-- Citas con sus servicios. El total preliminar suma los precios base (y el cargo urgente).
--   1 Ana:   ya pasó y tiene pedido en proceso.
--   2 Lucía: mañana, sin pedido (aparece en «citas por registrar»).
--   3 Marta: urgente, sin pedido.
--   4 Sofía: vestido de novia, se cotiza en el local (usa el servicio 5, que no se puede borrar).
--   5 Rosa:  ya pasó y su pedido se entregó.
-- -------------------------------------------------------------------------------------
insert into public.appointments (id, client_id, ticket, scheduled_date, scheduled_time, preliminary_total_mxn)
overriding system value
values
  (1, 1, '0427', current_date - 2, '10:30', 200),
  (2, 3, '0815', current_date + 1, '12:00',  80),
  (3, 5, '1503', current_date + 2, '09:30', 140),
  (4, 6, '2210', current_date + 3, '16:00',   0),
  (5, 2, '3388', current_date - 7, '11:00', 150);

insert into public.appointment_services (appointment_id, service_id)
values
  (1, 1), (1, 2),
  (2, 1),
  (3, 3), (3, 7),
  (4, 5),
  (5, 4);

-- -------------------------------------------------------------------------------------
-- Pedidos: uno en cada estado. Dos vienen de una cita (heredan su folio y su clienta) y el
-- resto son de mostrador.
-- -------------------------------------------------------------------------------------
insert into public.orders (id, client_id, appointment_id, ticket, work, final_price_mxn, delivery_date, status)
overriding system value
values
  (1, 1, 1,    '0427', 'Dobladillo y cambio de cierre', 200, current_date + 3,  'inProgress'),
  (2, 2, 5,    '3388', 'Ajuste de cintura',             150, current_date - 3,  'delivered'),
  (3, 4, null, '5310', 'Ajuste de vestido',             250, current_date + 5,  'received'),
  (4, 2, null, '1290', 'Cambio de cierre de chamarra',  120, current_date + 1,  'ready'),
  (5, 1, null, '6042', 'Parche en rodilla',              40, current_date,      'onTheWay'),
  (6, 6, null, '7777', 'Bastilla de falda',              90, current_date - 10, 'cancelled');

-- -------------------------------------------------------------------------------------
-- Las secuencias siguen después de los ids fijos, para que la API inserte sin chocar.
-- -------------------------------------------------------------------------------------
select setval(pg_get_serial_sequence('public.services', 'id'), (select max(id) from public.services));
select setval(pg_get_serial_sequence('public.clients', 'id'), (select max(id) from public.clients));
select setval(pg_get_serial_sequence('public.appointments', 'id'), (select max(id) from public.appointments));
select setval(pg_get_serial_sequence('public.orders', 'id'), (select max(id) from public.orders));

commit;
