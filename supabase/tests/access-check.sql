-- Checks who reaches the CALM tables (odd/tasks/acceso-supabase.md, spec items 3-5, and the
-- client app's access in CALM_mobile odd/tasks/datos-reales-cliente.md: the active catalog is
-- public, and a signed-in client reads exactly her own rows).
-- Needs write access: it adds sample rows, then reads, adds, changes and deletes as each role.
-- It always ends by raising an error, so Postgres rolls everything back and nothing stays.
-- The error message is the result: "access check passed: N checks" or the failed checks.

do $check$
declare
  admin_id constant uuid := gen_random_uuid();
  other_user_id constant uuid := gen_random_uuid();
  client_user_id constant uuid := gen_random_uuid();
  every_table constant text[] := array[
    'admins', 'clients', 'services', 'appointments',
    'appointment_services', 'orders', 'weekly_schedule', 'blocked_dates'
  ];
  sample_client_id bigint;
  sample_service_id bigint;
  inactive_service_id bigint;
  expected_rows integer;
  inactive_seen integer;
  sample_appointment_id bigint;
  free_ticket text;
  actor record;
  table_name text;
  rows_seen integer;
  rows_changed integer;
  service_added boolean;
  check_count integer := 0;
  failures text[] := '{}';
begin
  -- Sample rows, written as the database owner, past row level security.
  insert into auth.users (id, aud, role, email)
  values
    (admin_id, 'authenticated', 'authenticated', 'access-check-admin@panel.calm.invalid'),
    (other_user_id, 'authenticated', 'authenticated', 'access-check-user@clientes.calm.invalid'),
    (client_user_id, 'authenticated', 'authenticated', 'access-check-client@clients.calm.invalid');
  insert into public.admins (id) values (admin_id);

  -- A client with an app account: an account needs a phone and a NIP hash, never checked here.
  insert into public.clients (name, phone, nip_hash, user_id)
  values ('Cliente de prueba', '0000000001', 'not-a-hash', client_user_id)
  returning id into sample_client_id;
  insert into public.services (name, category, base_price_mxn, estimated_days)
  values ('Servicio de prueba de acceso', 'arreglo', 120, 2)
  returning id into sample_service_id;
  insert into public.appointments (client_id, ticket, scheduled_date, scheduled_time, preliminary_total_mxn)
  values (sample_client_id, '0000', date '2099-01-05', time '10:30', 120)
  returning id into sample_appointment_id;
  -- A deactivated service the client booked: she still reads it, nobody else but the admin does.
  insert into public.services (name, category, base_price_mxn, estimated_days, is_active)
  values ('Servicio inactivo de prueba de acceso', 'arreglo', 90, 1, false)
  returning id into inactive_service_id;
  insert into public.appointment_services (appointment_id, service_id)
  values (sample_appointment_id, sample_service_id), (sample_appointment_id, inactive_service_id);

  -- Real orders may hold any ticket; take one no active order uses.
  select lpad(candidate::text, 4, '0') into free_ticket
  from generate_series(0, 9999) as candidate
  where lpad(candidate::text, 4, '0') not in (
    select ticket from public.orders where status not in ('delivered', 'cancelled')
  )
  limit 1;
  insert into public.orders (client_id, appointment_id, ticket, work, final_price_mxn, delivery_date)
  values (sample_client_id, sample_appointment_id, free_ticket, 'Bastilla de prueba', 150, date '2099-01-07');

  -- Every weekday may already have its real hours.
  insert into public.weekly_schedule (weekday, opens_at, closes_at, updated_by)
  values ('monday', time '09:00', time '18:00', admin_id)
  on conflict (weekday) do nothing;
  insert into public.blocked_dates (blocked_date, blocked_by) values (date '2099-12-25', admin_id);

  -- The admin acts last: a role that wrongly changed or deleted rows first would leave
  -- her less to change, and her checks would fail too.
  for actor in
    select *
    from (
      values
        ('an anonymous visitor', 'anon', null::uuid, false, false),
        ('a signed-in user who is not an admin', 'authenticated', other_user_id, false, false),
        ('the client', 'authenticated', client_user_id, false, true),
        ('the admin', 'authenticated', admin_id, true, false)
    ) as actors (name, role_name, user_id, is_admin, is_client)
  loop
    reset role;
    perform set_config(
      'request.jwt.claims',
      json_build_object('sub', actor.user_id, 'role', actor.role_name)::text,
      true
    );
    execute format('set local role %I', actor.role_name);

    -- Spec 3. Anonymous visitors never reach the function: every policy is for signed-in users.
    if actor.role_name = 'authenticated' then
      check_count := check_count + 1;
      if private.is_admin() is distinct from actor.is_admin then
        failures := failures || format('is_admin() is not %s for %s', actor.is_admin, actor.name);
      end if;
    end if;

    -- Spec 4 and 5: reading. A denied table counts as no row seen. The admin sees every table;
    -- everyone sees the active catalog; the client sees exactly her own rows and nothing else.
    foreach table_name in array every_table loop
      begin
        execute format('select count(*) from public.%I', table_name) into rows_seen;
      exception when insufficient_privilege then
        rows_seen := 0;
      end;
      expected_rows := case
        when actor.is_admin or table_name = 'services' then null
        when actor.is_client and table_name = 'appointment_services' then 2
        when actor.is_client and table_name in ('clients', 'appointments', 'orders') then 1
        else 0
      end;
      check_count := check_count + 1;
      if (expected_rows is null and rows_seen = 0) or rows_seen <> expected_rows then
        failures := failures || format('%s sees %s rows in %s', actor.name, rows_seen, table_name);
      end if;
    end loop;

    -- Deactivated services: the admin sees them all, the client only the one she booked.
    begin
      select count(*) into inactive_seen from public.services where not is_active;
    exception when insufficient_privilege then
      inactive_seen := 0;
    end;
    check_count := check_count + 1;
    if (actor.is_admin and inactive_seen < 1)
      or (actor.is_client and inactive_seen <> 1)
      or (not actor.is_admin and not actor.is_client and inactive_seen <> 0) then
      failures := failures || format('%s sees %s deactivated services', actor.name, inactive_seen);
    end if;

    -- Adding.
    begin
      insert into public.services (name, category, base_price_mxn, estimated_days)
      values ('Servicio que agrega ' || actor.name, 'arreglo', 100, 1);
      service_added := true;
    exception when insufficient_privilege then
      service_added := false;
    end;
    check_count := check_count + 1;
    if service_added is distinct from actor.is_admin then
      failures := failures || format('%s %s add a service', actor.name, case when service_added then 'can' else 'cannot' end);
    end if;

    -- Changing.
    begin
      update public.orders set work = work;
      get diagnostics rows_changed = row_count;
    exception when insufficient_privilege then
      rows_changed := 0;
    end;
    check_count := check_count + 1;
    if (rows_changed > 0) is distinct from actor.is_admin then
      failures := failures || format('%s changed %s orders', actor.name, rows_changed);
    end if;

    -- Deleting.
    begin
      delete from public.blocked_dates where blocked_date = date '2099-12-25';
      get diagnostics rows_changed = row_count;
    exception when insufficient_privilege then
      rows_changed := 0;
    end;
    check_count := check_count + 1;
    if (rows_changed > 0) is distinct from actor.is_admin then
      failures := failures || format('%s deleted %s blocked dates', actor.name, rows_changed);
    end if;
  end loop;

  reset role;
  if cardinality(failures) > 0 then
    raise exception 'access check failed, % of % checks: %',
      cardinality(failures), check_count, array_to_string(failures, '; ');
  end if;
  raise exception 'access check passed: % checks', check_count
    using hint = 'Raised on purpose, so that nothing this check wrote stays.';
end
$check$;
