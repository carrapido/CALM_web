export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday'

export const WEEKDAYS_FROM_MONDAY: readonly Weekday[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]

// A day on the Cancún calendar as `YYYY-MM-DD`, free of any time zone.
export type CalendarDate = string

// The wall-clock reading in Cancún: calendar day and `HH:MM` time.
export type CancunMoment = {
  date: CalendarDate
  time: string
}

const CANCUN_CLOCK_PARTS = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Cancun',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function todayInCancun(now: Date): CalendarDate {
  return momentInCancun(now).date
}

export function momentInCancun(now: Date): CancunMoment {
  const parts = CANCUN_CLOCK_PARTS.formatToParts(now)
  const valueOf = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value
  return {
    date: `${valueOf('year')}-${valueOf('month')}-${valueOf('day')}`,
    time: `${valueOf('hour')}:${valueOf('minute')}`,
  }
}

export function addDays(date: CalendarDate, days: number): CalendarDate {
  const midnight = utcMidnightOf(date)
  midnight.setUTCDate(midnight.getUTCDate() + days)
  return midnight.toISOString().slice(0, 10)
}

export function weekdayOf(date: CalendarDate): Weekday {
  // getUTCDay() counts from Sunday = 0; the week here starts on Monday.
  const daysSinceMonday = (utcMidnightOf(date).getUTCDay() + 6) % 7
  return WEEKDAYS_FROM_MONDAY[daysSinceMonday]
}

// Midnight UTC carries the calendar day unchanged; format it with timeZone 'UTC'.
export function utcMidnightOf(date: CalendarDate): Date {
  return new Date(`${date}T00:00:00Z`)
}
