import type {
  AddRefusal, AppointmentSlot, NewOrder, Order, OrderChanges, OrderRepository,
} from '../src/types/order.js'

export type Client = { name: string; whatsapp?: string }
export type ScheduledAppointment = AppointmentSlot & { client: Client }

// Stands in for the orders, clients and appointments tables, with their unique keys.
export class InMemoryOrderRepository implements OrderRepository {
  private orders: Order[]
  private clients: Client[]
  private readonly appointments: ScheduledAppointment[]

  constructor(orders: Order[] = [], appointments: ScheduledAppointment[] = [], clients: Client[] = []) {
    this.orders = orders
    this.appointments = appointments
    this.clients = [...clients, ...appointments.map((appointment) => appointment.client)]
  }

  async all(): Promise<Order[]> {
    return [...this.orders].sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate))
  }

  async add(newOrder: NewOrder): Promise<Order | AddRefusal> {
    const client = this.clientOf(newOrder)
    if (client === undefined) return 'appointmentNotFound'
    if (this.activeOrderWith(newOrder.ticket) !== undefined) return 'ticketTaken'
    if (newOrder.appointment !== undefined && this.hasOrderFrom(newOrder.appointment)) {
      return 'appointmentHasOrder'
    }
    const order = orderOf(newOrder, client)
    this.orders = [...this.orders, order]
    return order
  }

  async updateActive(ticket: string, changes: OrderChanges): Promise<Order | null> {
    const current = this.activeOrderWith(ticket)
    if (current === undefined) return null
    const updated = { ...current, ...changes }
    this.orders = this.orders.map((order) => (order === current ? updated : order))
    return updated
  }

  private clientOf(newOrder: NewOrder): Client | undefined {
    const { appointment } = newOrder
    if (appointment !== undefined) {
      return this.appointments.find((scheduled) => isSameSlot(scheduled, appointment))?.client
    }
    const known = this.clients.find((client) => newOrder.whatsapp !== undefined && client.whatsapp === newOrder.whatsapp)
    if (known !== undefined) return known
    const client = { name: newOrder.clientName, whatsapp: newOrder.whatsapp }
    this.clients = [...this.clients, client]
    return client
  }

  private activeOrderWith(ticket: string): Order | undefined {
    return this.orders.find((order) => order.ticket === ticket && !['delivered', 'cancelled'].includes(order.status))
  }

  private hasOrderFrom(slot: AppointmentSlot): boolean {
    return this.orders.some((order) => order.appointment !== undefined && isSameSlot(order.appointment, slot))
  }
}

function orderOf(newOrder: NewOrder, client: Client): Order {
  return {
    ticket: newOrder.ticket,
    clientName: client.name,
    whatsapp: client.whatsapp,
    work: newOrder.work,
    finalPriceMxn: newOrder.finalPriceMxn,
    deliveryDate: newOrder.deliveryDate,
    status: newOrder.status,
    appointment: newOrder.appointment,
  }
}

function isSameSlot(a: AppointmentSlot, b: AppointmentSlot): boolean {
  return a.date === b.date && a.time === b.time
}
