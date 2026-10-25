import type { Appointment } from './appointment'
import { weekdayOf, type CalendarDate, type CancunMoment } from '../../shared/domain/calendar-date'
import { slotTimes, type WeeklySchedule } from './schedule'

export type DayStatus = 'open' | 'closed' | 'blocked'

export type DayAgenda = {
  status: DayStatus
  // Business-hour slots of an open day, plus any appointment outside them.
  slots: Slot[]
}

export type Slot = {
  time: string
  hasStarted: boolean
  appointment?: Appointment
}

export function dayAgenda(
  schedule: WeeklySchedule,
  date: CalendarDate,
  appointments: Appointment[],
  blockedDates: CalendarDate[],
  now: CancunMoment,
): DayAgenda {
  const status = dayStatus(schedule, date, blockedDates)
  const slots = slotTimesOfDay(schedule, date, status, appointments).map((time) => ({
    time,
    hasStarted: hasStarted({ date, time }, now),
    appointment: appointments.find((appointment) => appointment.time === time),
  }))
  return { status, slots }
}

export function dayStatus(
  schedule: WeeklySchedule,
  date: CalendarDate,
  blockedDates: CalendarDate[],
): DayStatus {
  if (!schedule[weekdayOf(date)].isOpen) return 'closed'
  return blockedDates.includes(date) ? 'blocked' : 'open'
}

// Hours may change after a booking; an appointment outside them must still show (P3).
function slotTimesOfDay(
  schedule: WeeklySchedule,
  date: CalendarDate,
  status: DayStatus,
  appointments: Appointment[],
): string[] {
  const hours = schedule[weekdayOf(date)]
  const businessTimes = status === 'open' && hours.isOpen ? slotTimes(hours) : []
  const appointmentTimes = appointments.map((appointment) => appointment.time)
  return [...new Set([...businessTimes, ...appointmentTimes])].sort()
}

// Zero-padded `YYYY-MM-DD` and `HH:MM` strings sort chronologically.
function hasStarted(slotStart: CancunMoment, now: CancunMoment): boolean {
  if (slotStart.date !== now.date) return slotStart.date < now.date
  return slotStart.time <= now.time
}
