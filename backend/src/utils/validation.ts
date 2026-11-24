import type { HttpError } from './http-error.js'

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
