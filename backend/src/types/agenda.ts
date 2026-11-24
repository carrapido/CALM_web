// The same JSON shapes as the panel's agenda types (src/utils/schedule.ts and
// src/types/appointment.ts in the frontend).

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

export type Weekday = (typeof WEEKDAYS)[number]

// `HH:MM`, on the hour or the half hour.
export type OpenHours = { isOpen: true; opensAt: string; closesAt: string }

export type DayHours = { isOpen: false } | OpenHours

export type WeeklySchedule = Record<Weekday, DayHours>

// `YYYY-MM-DD`, a calendar day in Cancún.
export type CalendarDate = string

export type Appointment = {
  // The 4-digit folio; it repeats across dates.
  ticket: string
  clientName: string
  // Left out when the client gave no phone.
  whatsapp?: string
  date: CalendarDate
  // `HH:MM`
  time: string
  quote: { services: string[]; preliminaryTotalMxn: number }
}

export interface AgendaRepository {
  // A weekday without a row is closed.
  weeklySchedule(): Promise<WeeklySchedule>
  // Replaces the seven weekdays at once.
  saveWeeklySchedule(schedule: WeeklySchedule, adminId: string): Promise<void>
  blockedDates(): Promise<CalendarDate[]>
  // Blocking a day that is already blocked changes nothing.
  blockDay(date: CalendarDate, adminId: string): Promise<void>
  unblockDay(date: CalendarDate): Promise<void>
  // From `first` to `last`, both included, by date and time.
  appointmentsBetween(first: CalendarDate, last: CalendarDate): Promise<Appointment[]>
  // False when no appointment has that ticket on that date.
  cancelAppointment(ticket: string, date: CalendarDate): Promise<boolean>
}
