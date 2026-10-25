import type { AgendaRepository } from '../../agenda/application/agenda-repository'
import type { Appointment } from '../../agenda/domain/appointment'
import { addDays, type CalendarDate } from '../../shared/domain/calendar-date'
import type { Order } from '../domain/order'
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

// Matched on ticket and appointment, since an old finished order may share the ticket.
function hasOrder(appointment: Appointment, orders: Order[]): boolean {
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
