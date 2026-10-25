import type { OrdersRepository } from '../application/orders-repository'
import { isActive, type Order } from '../domain/order'

export class InMemoryOrdersRepository implements OrdersRepository {
  private orderList: Order[]

  constructor(orders: Order[]) {
    this.orderList = orders
  }

  async orders(): Promise<Order[]> {
    return this.orderList
  }

  async addOrder(order: Order): Promise<void> {
    this.orderList = [...this.orderList, order]
  }

  async updateActiveOrder(order: Order): Promise<void> {
    this.orderList = this.orderList.map((current) =>
      isActive(current) && current.ticket === order.ticket ? order : current,
    )
  }
}
