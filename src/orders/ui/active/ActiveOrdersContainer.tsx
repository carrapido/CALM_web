import { useState } from 'react'
import { useQuery } from '../../../shared/ui/useQuery'
import type { OrdersRepository } from '../../application/orders-repository'
import { isActive, type Order, type OrderStatus } from '../../domain/order'
import { ActiveOrdersView } from './ActiveOrdersView'

type ActiveOrdersContainerProps = {
  repository: OrdersRepository
  onNewOrder: () => void
  onShowFinished: () => void
}

export function ActiveOrdersContainer({
  repository,
  onNewOrder,
  onShowFinished,
}: ActiveOrdersContainerProps) {
  const { data: orders, reload } = useQuery('orders', () => repository.orders())
  const [searchedTicket, setSearchedTicket] = useState<string>()

  const moveOrder = (order: Order, status: OrderStatus) =>
    repository.updateActiveOrder({ ...order, status }).then(reload)

  return (
    <ActiveOrdersView
      activeOrders={orders && activeByDeliveryDate(orders)}
      searchResult={
        orders && searchedTicket !== undefined
          ? { ticket: searchedTicket, orders: withTicket(orders, searchedTicket) }
          : undefined
      }
      onSearch={setSearchedTicket}
      onCloseSearch={() => setSearchedTicket(undefined)}
      onNewOrder={onNewOrder}
      onShowFinished={onShowFinished}
      onMove={moveOrder}
    />
  )
}

// Earliest delivery first, so what is due today is on top.
function activeByDeliveryDate(orders: Order[]): Order[] {
  return orders
    .filter(isActive)
    .sort((first, second) => first.deliveryDate.localeCompare(second.deliveryDate))
}

// Active orders first: a ticket is unique only among them.
function withTicket(orders: Order[], ticket: string): Order[] {
  const matches = orders.filter((order) => order.ticket === ticket)
  return [...matches.filter(isActive), ...matches.filter((order) => !isActive(order))]
}
