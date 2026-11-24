import type { Appointment } from '../types/appointment'
import type { CalendarDate } from '../utils/calendar-date'
import type { WeeklySchedule } from '../utils/schedule'

// Port: the CALM API in the running app, in memory in tests.
export interface AgendaRepository {
  weeklySchedule(): Promise<WeeklySchedule>
  saveWeeklySchedule(schedule: WeeklySchedule): Promise<void>
  // Active appointments from `first` to `last`, both included.
  appointmentsBetween(first: CalendarDate, last: CalendarDate): Promise<Appointment[]>
  // Tickets repeat across dates, so the date tells which appointment to cancel.
  cancelAppointment(ticket: string, date: CalendarDate): Promise<void>
  blockedDates(): Promise<CalendarDate[]>
  blockDay(date: CalendarDate): Promise<void>
  unblockDay(date: CalendarDate): Promise<void>
}
