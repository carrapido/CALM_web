-- The client app reads its own data (CALM_mobile odd/tasks/datos-reales-cliente.md, T2).
-- Policies are OR'ed with the admin's, which stay untouched: these only add what a client sees.

-- The signed-in client's own id, or null for anyone else (the admin has no clients row).
-- Security definer so policies can call it without depending on the clients policies.
create function private.current_client_id()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.clients where user_id = (select auth.uid());
$$;

revoke execute on function private.current_client_id() from public;
grant execute on function private.current_client_id() to authenticated;

create policy "A client reads her own orders" on public.orders
  for select to authenticated
  using (client_id = (select private.current_client_id()));

create policy "A client reads her own appointments" on public.appointments
  for select to authenticated
  using (client_id = (select private.current_client_id()));

create policy "A client reads the services of her own appointments" on public.appointment_services
  for select to authenticated
  using (
    appointment_id in (
      select id from public.appointments where client_id = (select private.current_client_id())
    )
  );

-- The active catalog is public: a first-time client browses it before she has an account.
create policy "Anyone reads the active services" on public.services
  for select to anon, authenticated
  using (is_active);

-- A deactivated service still names the work of an appointment that booked it.
create policy "A client reads the services she booked" on public.services
  for select to authenticated
  using (id in (select service_id from public.appointment_services));

-- The month the app can book: business hours, blocked days and booked slots from today to the
-- end of the month, with "today" and "now" on Cancún's wall clock. Booked slots carry a date and a
-- time only, never who booked them. A function rather than table grants, because the panel reads
-- weekly_schedule with select('*') and narrowing its columns would break it.
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
      (date_trunc('month', moment) + interval '1 month')::date as next_month
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
      where d.blocked_date >= b.today and d.blocked_date < b.next_month
    ),
    'booked', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', a.scheduled_date,
        'time', to_char(a.scheduled_time, 'HH24:MI')
      ) order by a.scheduled_date, a.scheduled_time), '[]'::jsonb)
      from public.appointments a
      where a.scheduled_date >= b.today and a.scheduled_date < b.next_month
    )
  )
  from bounds b;
$$;

revoke execute on function public.booking_calendar() from public;
grant execute on function public.booking_calendar() to anon, authenticated;
