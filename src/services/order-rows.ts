import { clockTimeOf } from '../utils/clock-time'
import { ORDER_STEPS, type Order, type OrderStatus } from '../utils/order'

// One order with its client and, when it came from one, its appointment.
export type OrderRow = {
  ticket: string
  work: string
  final_price_mxn: number
  delivery_date: string
  status: string
  client: { name: string; phone: string | null }
  appointment: { scheduled_date: string; scheduled_time: string } | null
}

const ORDER_STATUSES: readonly OrderStatus[] = [...ORDER_STEPS, 'onTheWay', 'cancelled']

export function orderFromRow(row: OrderRow): Order {
  return {
    ticket: row.ticket,
    clientName: row.client.name,
    whatsapp: row.client.phone ?? undefined,
    work: row.work,
    finalPriceMxn: row.final_price_mxn,
    deliveryDate: row.delivery_date,
    status: statusFrom(row.status),
    appointment: row.appointment
      ? { date: row.appointment.scheduled_date, time: clockTimeOf(row.appointment.scheduled_time) }
      : undefined,
  }
}

// The columns the panel can change on an order; the client and the appointment stay.
export function orderColumnsOf(order: Order) {
  return {
    work: order.work,
    final_price_mxn: order.finalPriceMxn,
    delivery_date: order.deliveryDate,
    status: order.status,
  }
}

function statusFrom(value: string): OrderStatus {
  const status = ORDER_STATUSES.find((known) => known === value)
  if (status === undefined) throw new Error(`Unknown order status: ${value}`)
  return status
}
