import type { Appointment } from '../../agenda/domain/appointment'
import type { CalendarDate } from '../../shared/domain/calendar-date'
import { isActive, isReadyForPickup, type Order } from '../../orders/domain/order'

// Where an order stands, which its chip shows by color.
export type OrderTone = 'active' | 'ready' | 'finished'

// An appointment on its date, or an order on its delivery date.
export type CalendarEntry =
  | { kind: 'appointment'; date: CalendarDate; appointment: Appointment }
  | { kind: 'order'; date: CalendarDate; tone: OrderTone; order: Order }

// The "Qué ver" selector: Todo, Citas or Pedidos; Pedidos also picks En el taller or Terminados.
export type CalendarFilter = {
  show: 'all' | 'appointments' | 'orders'
  orders: 'workshop' | 'finished'
}

// Appointments by time come before orders by ticket, so each day lists them in that order.
export function calendarEntries(appointments: Appointment[], orders: Order[]): CalendarEntry[] {
  return [...appointmentEntries(appointments), ...orderEntries(orders)]
}

export function entriesOn(entries: CalendarEntry[], date: CalendarDate): CalendarEntry[] {
  return entries.filter((entry) => entry.date === date)
}

// Todo hides finished orders, as the workshop list does.
export function visibleEntries(entries: CalendarEntry[], filter: CalendarFilter): CalendarEntry[] {
  return entries.filter((entry) => isVisible(entry, filter))
}

function appointmentEntries(appointments: Appointment[]): CalendarEntry[] {
  return [...appointments]
    .sort((first, second) => first.time.localeCompare(second.time))
    .map((appointment) => ({ kind: 'appointment', date: appointment.date, appointment }))
}

function orderEntries(orders: Order[]): CalendarEntry[] {
  return [...orders]
    .sort((first, second) => first.ticket.localeCompare(second.ticket))
    .map((order) => ({ kind: 'order', date: order.deliveryDate, tone: toneOf(order), order }))
}

function toneOf(order: Order): OrderTone {
  if (!isActive(order)) return 'finished'
  return isReadyForPickup(order) ? 'ready' : 'active'
}

function isVisible(entry: CalendarEntry, { show, orders }: CalendarFilter): boolean {
  if (entry.kind === 'appointment') return show !== 'orders'
  if (show === 'appointments') return false
  const isFinished = entry.tone === 'finished'
  return show === 'orders' && orders === 'finished' ? isFinished : !isFinished
}
