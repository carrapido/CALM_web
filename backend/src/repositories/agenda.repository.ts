import type { Pool } from 'pg'
import {
  WEEKDAYS,
  type AgendaRepository,
  type Appointment,
  type DayHours,
  type WeeklySchedule,
  type Weekday,
} from '../types/agenda.js'

// node-postgres reads `time` as `HH:MM:SS`; dates come as text (::text) so no timezone shifts them.
type ScheduleRow = { weekday: Weekday; opens_at: string | null; closes_at: string | null }

type AppointmentRow = {
  ticket: string
  scheduled_date: string
  scheduled_time: string
  preliminary_total_mxn: number
  client_name: string
  client_phone: string | null
  service_names: string[]
}

// One statement, so the seven weekdays change together or not at all.
const SAVE_WEEK = `insert into weekly_schedule (weekday, opens_at, closes_at, updated_by)
  select weekday, opens_at, closes_at, $4
  from unnest($1::text[], $2::time[], $3::time[]) as week (weekday, opens_at, closes_at)
  on conflict (weekday) do update
  set opens_at = excluded.opens_at, closes_at = excluded.closes_at, updated_by = excluded.updated_by`

const APPOINTMENTS_BETWEEN = `select a.ticket, a.scheduled_date::text as scheduled_date, a.scheduled_time::text as scheduled_time,
    a.preliminary_total_mxn, c.name as client_name, c.phone as client_phone,
    array(
      select s.name from appointment_services aps join services s on s.id = aps.service_id
      where aps.appointment_id = a.id order by s.id
    ) as service_names
  from appointments a join clients c on c.id = a.client_id
  where a.scheduled_date between $1 and $2
  order by a.scheduled_date, a.scheduled_time`

export function agendaRepository(pool: Pool): AgendaRepository {
  return {
    async weeklySchedule() {
      const { rows } = await pool.query<ScheduleRow>(
        'select weekday, opens_at::text as opens_at, closes_at::text as closes_at from weekly_schedule',
      )
      return weeklyScheduleFrom(rows)
    },

    async saveWeeklySchedule(schedule, adminId) {
      const days = WEEKDAYS.map((weekday) => schedule[weekday])
      await pool.query(SAVE_WEEK, [
        WEEKDAYS,
        days.map((hours) => (hours.isOpen ? hours.opensAt : null)),
        days.map((hours) => (hours.isOpen ? hours.closesAt : null)),
        adminId,
      ])
    },

    async blockedDates() {
      const { rows } = await pool.query<{ blocked_date: string }>(
        'select blocked_date::text as blocked_date from blocked_dates order by blocked_date',
      )
      return rows.map((row) => row.blocked_date)
    },

    async blockDay(date, adminId) {
      await pool.query(
        'insert into blocked_dates (blocked_date, blocked_by) values ($1, $2) on conflict (blocked_date) do nothing',
        [date, adminId],
      )
    },

    async unblockDay(date) {
      await pool.query('delete from blocked_dates where blocked_date = $1', [date])
    },

    async appointmentsBetween(first, last) {
      const { rows } = await pool.query<AppointmentRow>(APPOINTMENTS_BETWEEN, [first, last])
      return rows.map(appointmentFromRow)
    },

    // The appointment's services go with it (on delete cascade); an order that points to it
    // makes Postgres refuse (23503), which the error middleware answers as 409.
    async cancelAppointment(ticket, date) {
      const { rowCount } = await pool.query(
        'delete from appointments where ticket = $1 and scheduled_date = $2',
        [ticket, date],
      )
      return rowCount !== 0
    },
  }
}

// A weekday without a row stays closed.
function weeklyScheduleFrom(rows: ScheduleRow[]): WeeklySchedule {
  const schedule: WeeklySchedule = {
    monday: { isOpen: false },
    tuesday: { isOpen: false },
    wednesday: { isOpen: false },
    thursday: { isOpen: false },
    friday: { isOpen: false },
    saturday: { isOpen: false },
    sunday: { isOpen: false },
  }
  for (const row of rows) schedule[row.weekday] = dayHoursFrom(row)
  return schedule
}

function dayHoursFrom(row: ScheduleRow): DayHours {
  if (row.opens_at === null || row.closes_at === null) return { isOpen: false }
  return { isOpen: true, opensAt: clockTimeOf(row.opens_at), closesAt: clockTimeOf(row.closes_at) }
}

function appointmentFromRow(row: AppointmentRow): Appointment {
  return {
    ticket: row.ticket,
    clientName: row.client_name,
    whatsapp: row.client_phone ?? undefined,
    date: row.scheduled_date,
    time: clockTimeOf(row.scheduled_time),
    quote: { services: row.service_names, preliminaryTotalMxn: row.preliminary_total_mxn },
  }
}

// Postgres writes `time` as `HH:MM:SS`; the panel works in `HH:MM`.
function clockTimeOf(postgresTime: string): string {
  return postgresTime.slice(0, 5)
}
