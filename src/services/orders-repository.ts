import type { Order } from '../utils/order'

// Port: the CALM API in the running app, in memory in tests.
export interface OrdersRepository {
  orders(): Promise<Order[]>
  addOrder(order: Order): Promise<void>
  // Replaces the active order holding the same ticket; finished orders never change.
  updateActiveOrder(order: Order): Promise<void>
}
