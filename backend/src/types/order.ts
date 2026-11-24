// The same JSON shape as the panel's Order type (src/utils/order.ts in the frontend).

// delivered and cancelled end an order; the client sets onTheWay from the app.
export const ORDER_STATUSES = ['received', 'inProgress', 'ready', 'onTheWay', 'delivered', 'cancelled'] as const

export type OrderStatus = (typeof ORDER_STATUSES)[number]

export function isOrderStatus(value: unknown): value is OrderStatus {
  return ORDER_STATUSES.some((status) => status === value)
}

// The slot an order came from: one appointment per date and time (HH:MM).
export type AppointmentSlot = { date: string; time: string }

export type Order = {
  ticket: string
  clientName: string
  // 10-digit Mexican number; a walk-in client may leave it out.
  whatsapp?: string
  work: string
  finalPriceMxn: number
  // YYYY-MM-DD
  deliveryDate: string
  status: OrderStatus
  // A walk-in client has none.
  appointment?: AppointmentSlot
}

// What the panel can change on an order; the ticket, client and appointment stay.
export type OrderChanges = Pick<Order, 'work' | 'finalPriceMxn' | 'deliveryDate' | 'status'>

// An order from an appointment belongs to its client; a walk-in order names its own.
export type NewOrder = OrderChanges & { ticket: string } & (
  | { appointment: AppointmentSlot }
  | { appointment?: undefined; clientName: string; whatsapp?: string }
)

export type AddRefusal = 'appointmentNotFound' | 'ticketTaken' | 'appointmentHasOrder'

export interface OrderRepository {
  // Ordered by delivery date.
  all(): Promise<Order[]>
  // Finds or creates the client and stores the order in one transaction.
  add(order: NewOrder): Promise<Order | AddRefusal>
  // Changes the order holding the ticket that is not delivered or cancelled; null when none.
  updateActive(ticket: string, changes: OrderChanges): Promise<Order | null>
}
