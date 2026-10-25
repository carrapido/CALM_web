import type { Appointment } from '../domain/appointment'
import type { CalendarDate } from '../../shared/domain/calendar-date'
import type { WeeklySchedule } from '../domain/schedule'

// Port: the in-memory adapter stands in until the API exists.
export interface AgendaRepository {
  weeklySchedule(): Promise<WeeklySchedule>
  saveWeeklySchedule(schedule: WeeklySchedule): Promise<void>
  // Active appointments from `first` to `last`, both included.
  appointmentsBetween(first: CalendarDate, last: CalendarDate): Promise<Appointment[]>
  cancelAppointment(ticket: string): Promise<void>
  blockedDates(): Promise<CalendarDate[]>
  blockDay(date: CalendarDate): Promise<void>
  unblockDay(date: CalendarDate): Promise<void>
}
