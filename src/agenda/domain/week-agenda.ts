import type { Appointment } from './appointment'
import { WEEKDAYS_FROM_MONDAY, addDays, weekdayOf, type CalendarDate } from '../../shared/domain/calendar-date'
import { dayStatus, type DayStatus } from './day-agenda'
import type { WeeklySchedule } from './schedule'

export type WeekDaySummary = {
  date: CalendarDate
  status: DayStatus
  appointmentCount: number
}

// Monday to Sunday of the week that holds `date`.
export function weekDates(date: CalendarDate): CalendarDate[] {
  const monday = addDays(date, -WEEKDAYS_FROM_MONDAY.indexOf(weekdayOf(date)))
  return WEEKDAYS_FROM_MONDAY.map((_, index) => addDays(monday, index))
}

export function weekAgenda(
  schedule: WeeklySchedule,
  dates: CalendarDate[],
  appointments: Appointment[],
  blockedDates: CalendarDate[],
): WeekDaySummary[] {
  return dates.map((date) => ({
    date,
    status: dayStatus(schedule, date, blockedDates),
    appointmentCount: appointments.filter((appointment) => appointment.date === date).length,
  }))
}
