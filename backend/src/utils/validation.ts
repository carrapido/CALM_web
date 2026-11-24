import type { HttpError } from './http-error.js'

// A Mexican cell phone and the app's NIP, once digitsOf has dropped spaces and dashes.
export const PHONE_PATTERN = /^\d{10}$/
export const NIP_PATTERN = /^\d{4}$/

// "998 123-4567" is a valid phone; anything that is not text has no digits.
export function digitsOf(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}

// `HH:MM` on the hour or the half hour; zero-padded, so text order is time order.
export function isSlotTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):(00|30)$/.test(value)
}

// A real day in `YYYY-MM-DD`: Date rolls 2026-02-30 over to March, which the round trip catches,
// so a wrong date fails here rather than in Postgres.
export function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const day = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(day.getTime()) && day.toISOString().slice(0, 10) === value
}

// The 4-digit ticket a client shows at the counter. Each route answers a wrong one with its
// own 400, so the caller passes it.
export function ticketOf(value: unknown, invalidTicket: HttpError): string {
  if (typeof value !== 'string' || !/^\d{4}$/.test(value)) throw invalidTicket
  return value
}
