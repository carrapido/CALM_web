import type { CalendarDate } from '../../shared/domain/calendar-date'

// What the admin typed, before it becomes an order.
export type NewOrderDraft = {
  clientName: string
  whatsapp: string
  work: string
  finalPrice: string
  deliveryDate: string
}

export type NewOrderField = keyof NewOrderDraft

const FIELDS: readonly NewOrderField[] = ['clientName', 'whatsapp', 'work', 'finalPrice', 'deliveryDate']

const IS_VALID: Record<NewOrderField, (value: string, today: CalendarDate) => boolean> = {
  clientName: (name) => name.trim() !== '',
  whatsapp: (number) => number === '' || /^\d{10}$/.test(number),
  work: (work) => work.trim() !== '',
  finalPrice: (price) => /^\d+$/.test(price) && Number(price) > 0,
  // A complete `YYYY-MM-DD` sorts chronologically against today.
  deliveryDate: (date, today) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today,
}

export function invalidFields(draft: NewOrderDraft, today: CalendarDate): NewOrderField[] {
  return FIELDS.filter((field) => !IS_VALID[field](draft[field], today))
}
