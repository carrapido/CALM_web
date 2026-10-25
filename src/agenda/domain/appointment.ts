import type { CalendarDate } from '../../shared/domain/calendar-date'

export type Appointment = {
  ticket: string
  clientName: string
  // 10-digit Mexican national number; the client may leave it out.
  whatsapp?: string
  date: CalendarDate
  time: string
  quote: Quote
}

export type Quote = {
  services: string[]
  preliminaryTotalMxn: number
}
