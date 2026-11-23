-- The client app books this month and the next (CALM_mobile odd/tasks/panel-y-ajustes.md, S6), so
-- late in a month it still has days to offer. Only the window widens: same answer, same grants.
create or replace function public.booking_calendar()
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
      -- The first day after next month: blocked days and bookings run up to it.
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
