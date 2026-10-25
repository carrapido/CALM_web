import type { Order } from '../domain/order'
import { OrderCard, type MoveOrder } from './OrderCard'

type OrderListProps = {
  label: string
  orders: Order[]
  onMove?: MoveOrder
}

export function OrderList({ label, orders, onMove }: OrderListProps) {
  return (
    <ol aria-label={label} className="flex flex-col gap-space-md">
      {orders.map((order) => (
        <li key={`${order.ticket}-${order.deliveryDate}-${order.status}`}>
          <OrderCard order={order} onMove={onMove} />
        </li>
      ))}
    </ol>
  )
}
