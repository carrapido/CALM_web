import type { Weekday } from '../../shared/domain/calendar-date'

export type OpenHours = { isOpen: true; opensAt: string; closesAt: string }

export type DayHours = { isOpen: false } | OpenHours

export type WeeklySchedule = Record<Weekday, DayHours>

const SLOT_MINUTES = 30

// The hours the admin can pick in "Mi horario", 06:00 to 22:00 inclusive.
export const SCHEDULE_TIMES = timesFrom('06:00', '22:30')

export function slotTimes({ opensAt, closesAt }: OpenHours): string[] {
  return timesFrom(opensAt, closesAt)
}

export function closesAfterOpening({ opensAt, closesAt }: Omit<OpenHours, 'isOpen'>): boolean {
  return toMinutes(closesAt) > toMinutes(opensAt)
}

// Every slot start from `start` up to, but not including, `end`.
function timesFrom(start: string, end: string): string[] {
  const times: string[] = []
  for (let minutes = toMinutes(start); minutes < toMinutes(end); minutes += SLOT_MINUTES) {
    times.push(toTime(minutes))
  }
  return times
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function toTime(minutes: number): string {
  const hours = String(Math.floor(minutes / 60)).padStart(2, '0')
  return `${hours}:${String(minutes % 60).padStart(2, '0')}`
}
