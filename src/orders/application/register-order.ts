import type { AgendaRepository } from '../../agenda/application/agenda-repository'
import type { Appointment } from '../../agenda/domain/appointment'
import type { CalendarDate } from '../../shared/domain/calendar-date'
import { isActive, type Order } from '../domain/order'
import { newTicket } from '../domain/ticket'
import type { OrdersRepository } from './orders-repository'

export type OrderDetails = Pick<
  Order,
  'clientName' | 'whatsapp' | 'work' | 'finalPriceMxn' | 'deliveryDate'
>

type RegisterOrderDependencies = {
  orders: OrdersRepository
  agenda: AgendaRepository
  random: () => number
}

const LAST_CALENDAR_DATE = '9999-12-31'

// An order from an appointment keeps its ticket; a walk-in client gets a new one.
export async function registerOrder(
  dependencies: RegisterOrderDependencies,
  details: OrderDetails,
  appointment: Appointment | undefined,
  today: CalendarDate,
): Promise<Order> {
  const ticket = appointment?.ticket ?? (await newWalkInTicket(dependencies, today))
  const order: Order = {
    ...details,
    ticket,
    status: 'received',
    appointment: appointment && { date: appointment.date, time: appointment.time },
  }
  await dependencies.orders.addOrder(order)
  return order
}

// Unique among active tickets: open orders and appointments still to come.
async function newWalkInTicket(
  { orders, agenda, random }: RegisterOrderDependencies,
  today: CalendarDate,
): Promise<string> {
  const [allOrders, upcomingAppointments] = await Promise.all([
    orders.orders(),
    agenda.appointmentsBetween(today, LAST_CALENDAR_DATE),
  ])
  const takenTickets = new Set([
    ...allOrders.filter(isActive).map((order) => order.ticket),
    ...upcomingAppointments.map((appointment) => appointment.ticket),
  ])
  return newTicket(takenTickets, random)
}
