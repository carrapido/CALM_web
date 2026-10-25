import type { CalendarDate } from '../../shared/domain/calendar-date'

// The happy path, in order; Cancelado is an exit from it, not a step.
export const ORDER_STEPS = ['received', 'inProgress', 'ready', 'delivered'] as const

export type OrderStep = (typeof ORDER_STEPS)[number]

export type OrderStatus = OrderStep | 'cancelled'

export type Order = {
  ticket: string
  clientName: string
  // 10-digit Mexican national number; the client may leave it out.
  whatsapp?: string
  work: string
  finalPriceMxn: number
  deliveryDate: CalendarDate
  status: OrderStatus
  // The appointment it came from; a walk-in client has none.
  appointment?: { date: CalendarDate; time: string }
}

export function isActive({ status }: Order): boolean {
  return status !== 'delivered' && status !== 'cancelled'
}

// The status a forward step leads to; undefined once the order is finished.
export function nextStatus(status: OrderStatus): OrderStep | undefined {
  if (status === 'cancelled') return undefined
  return ORDER_STEPS[ORDER_STEPS.indexOf(status) + 1]
}

// The status a step back returns to; undefined for a new or finished order.
export function previousStatus(status: OrderStatus): OrderStep | undefined {
  if (status === 'cancelled' || status === 'delivered') return undefined
  return ORDER_STEPS[ORDER_STEPS.indexOf(status) - 1]
}
