import type { AgendaRepository } from './agenda-repository'
import type { Appointment } from '../types/appointment'
import { addDays, type CalendarDate } from '../utils/calendar-date'
import type { Order } from '../utils/order'
import type { OrdersRepository } from './orders-repository'

// Older appointments without an order are clients who did not come.
const RECENT_DAYS = 7

// Today's and recent appointments with no order yet: today first, each day by time.
export async function appointmentsAwaitingOrder(
  agenda: AgendaRepository,
  orders: OrdersRepository,
  today: CalendarDate,
): Promise<Appointment[]> {
  const [appointments, allOrders] = await Promise.all([
    agenda.appointmentsBetween(addDays(today, -RECENT_DAYS), today),
    orders.orders(),
  ])
  return appointments
    .filter((appointment) => !hasOrder(appointment, allOrders))
    .sort(byNewestDayThenTime)
}

const LAST_CALENDAR_DATE = '9999-12-31'

// Every appointment still waiting for its client to drop off the clothes: the recent ones she
// may still come to and all the future ones, soonest first.
export async function pendingAppointments(
  agenda: AgendaRepository,
  orders: OrdersRepository,
  today: CalendarDate,
): Promise<Appointment[]> {
  const [appointments, allOrders] = await Promise.all([
    agenda.appointmentsBetween(addDays(today, -RECENT_DAYS), LAST_CALENDAR_DATE),
    orders.orders(),
  ])
  return appointments
    .filter((appointment) => !hasOrder(appointment, allOrders))
    .sort(bySoonestDayThenTime)
}

// Matched on ticket and appointment, since an old finished order may share the ticket.
export function hasOrder(appointment: Appointment, orders: Order[]): boolean {
  return orders.some(
    (order) =>
      order.ticket === appointment.ticket &&
      order.appointment?.date === appointment.date &&
      order.appointment.time === appointment.time,
  )
}

function byNewestDayThenTime(first: Appointment, second: Appointment): number {
  if (first.date !== second.date) return second.date.localeCompare(first.date)
  return first.time.localeCompare(second.time)
}

function bySoonestDayThenTime(first: Appointment, second: Appointment): number {
  if (first.date !== second.date) return first.date.localeCompare(second.date)
  return first.time.localeCompare(second.time)
}
