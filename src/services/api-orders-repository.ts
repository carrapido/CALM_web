import type { ApiClient } from './api-client'
import type { OrdersRepository } from './orders-repository'
import type { Order } from '../utils/order'

// The orders through the CALM API (backend/src/routes/order.routes.ts).
export class ApiOrdersRepository implements OrdersRepository {
  private readonly api: ApiClient

  constructor(api: ApiClient) {
    this.api = api
  }

  orders(): Promise<Order[]> {
    return this.api.json('GET', '/orders')
  }

  // The API finds or creates the client and stores the order in one transaction; it answers
  // 409 when an active order holds the ticket or the appointment already has an order.
  async addOrder(order: Order): Promise<void> {
    await this.api.send('POST', '/orders', order)
  }

  // The API answers 404 when no active order holds the ticket.
  async updateActiveOrder({ ticket, work, finalPriceMxn, deliveryDate, status }: Order): Promise<void> {
    await this.api.send('PUT', `/orders/${ticket}`, { work, finalPriceMxn, deliveryDate, status })
  }
}
