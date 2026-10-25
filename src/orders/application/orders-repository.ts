import type { Order } from '../domain/order'

// Port: the in-memory adapter stands in until the API exists.
export interface OrdersRepository {
  orders(): Promise<Order[]>
  addOrder(order: Order): Promise<void>
  // Replaces the active order holding the same ticket; finished orders never change.
  updateActiveOrder(order: Order): Promise<void>
}
