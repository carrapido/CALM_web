import { utcMidnightOf, type CalendarDate } from '../domain/calendar-date'

const WEEKDAY = new Intl.DateTimeFormat('es-MX', { weekday: 'long', timeZone: 'UTC' })
const DAY_AND_MONTH = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
})
const PESOS = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

// "sábado 24 de octubre": es-MX would put a comma after the weekday.
export function formatLongDate(date: CalendarDate): string {
  const midnight = utcMidnightOf(date)
  return `${WEEKDAY.format(midnight)} ${DAY_AND_MONTH.format(midnight)}`
}

// "del 19 al 25 de octubre", or "del 26 de octubre al 1 de noviembre" across months.
export function formatDateRange(first: CalendarDate, last: CalendarDate): string {
  const firstDate = utcMidnightOf(first)
  const lastDate = utcMidnightOf(last)
  const isSameMonth = firstDate.getUTCMonth() === lastDate.getUTCMonth()
  const start = isSameMonth ? String(firstDate.getUTCDate()) : DAY_AND_MONTH.format(firstDate)
  return `del ${start} al ${DAY_AND_MONTH.format(lastDate)}`
}

export function formatPesos(amount: number): string {
  return `${PESOS.format(amount)} MXN`
}

export function formatCount(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}
