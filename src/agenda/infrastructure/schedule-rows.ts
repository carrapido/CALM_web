import { WEEKDAYS_FROM_MONDAY, type Weekday } from '../../shared/domain/calendar-date'
import type { Database } from '../../shared/infrastructure/database.types'
import { clockTimeOf } from '../../shared/infrastructure/clock-time'
import type { DayHours, WeeklySchedule } from '../domain/schedule'

type ScheduleRow = Database['public']['Tables']['weekly_schedule']['Row']
type ScheduleInsert = Database['public']['Tables']['weekly_schedule']['Insert']

// A weekday without a row stays closed.
export function weeklyScheduleFrom(rows: ScheduleRow[]): WeeklySchedule {
  const schedule: WeeklySchedule = {
    monday: { isOpen: false },
    tuesday: { isOpen: false },
    wednesday: { isOpen: false },
    thursday: { isOpen: false },
    friday: { isOpen: false },
    saturday: { isOpen: false },
    sunday: { isOpen: false },
  }
  for (const row of rows) schedule[weekdayFrom(row.weekday)] = dayHoursFrom(row)
  return schedule
}

// One row per weekday, so saving the week replaces all seven.
export function scheduleRowsOf(schedule: WeeklySchedule, adminId: string): ScheduleInsert[] {
  return WEEKDAYS_FROM_MONDAY.map((weekday) => {
    const hours = schedule[weekday]
    return {
      weekday,
      opens_at: hours.isOpen ? hours.opensAt : null,
      closes_at: hours.isOpen ? hours.closesAt : null,
      updated_by: adminId,
    }
  })
}

function dayHoursFrom(row: ScheduleRow): DayHours {
  if (row.opens_at === null || row.closes_at === null) return { isOpen: false }
  return { isOpen: true, opensAt: clockTimeOf(row.opens_at), closesAt: clockTimeOf(row.closes_at) }
}

function weekdayFrom(value: string): Weekday {
  const weekday = WEEKDAYS_FROM_MONDAY.find((day) => day === value)
  if (weekday === undefined) throw new Error(`Unknown weekday: ${value}`)
  return weekday
}
