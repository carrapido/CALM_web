import { useState } from 'react'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import { useQuery } from '../../../shared/ui/useQuery'
import type { OrdersRepository } from '../../application/orders-repository'
import { isActive, isReadyForPickup, type Order, type OrderStatus } from '../../domain/order'
import { OrdersView, type OrderListing, type OrdersFilter, type WorkshopCounts } from './OrdersView'

type OrdersContainerProps = {
  repository: OrdersRepository
  today: CalendarDate
}

export function OrdersContainer({ repository, today }: OrdersContainerProps) {
  const { data: orders, reload } = useQuery('orders', () => repository.orders())
  const [filter, setFilter] = useState<OrdersFilter>('workshop')
  const [searchedTicket, setSearchedTicket] = useState<string>()

  const moveOrder = (order: Order, status: OrderStatus) =>
    repository.updateActiveOrder({ ...order, status }).then(reload)

  const changeFilter = (newFilter: OrdersFilter) => {
    setFilter(newFilter)
    setSearchedTicket(undefined)
  }

  return (
    <OrdersView
      today={today}
      counts={orders && workshopCounts(orders)}
      filter={filter}
      listing={orders && listingOf(orders, filter, searchedTicket)}
      onFilterChange={changeFilter}
      onSearch={setSearchedTicket}
      onCloseSearch={() => setSearchedTicket(undefined)}
      onMove={moveOrder}
    />
  )
}

function workshopCounts(orders: Order[]): WorkshopCounts {
  const inWorkshop = orders.filter(isActive)
  return { inWorkshop: inWorkshop.length, ready: inWorkshop.filter(isReadyForPickup).length }
}

// A search shows every order with that ticket, whatever the filter.
function listingOf(orders: Order[], filter: OrdersFilter, searchedTicket: string | undefined): OrderListing {
  if (searchedTicket !== undefined) {
    return { kind: 'search', ticket: searchedTicket, orders: withTicket(orders, searchedTicket) }
  }
  if (filter === 'finished') return { kind: 'finished', orders: finishedNewestFirst(orders) }
  return { kind: 'workshop', orders: activeByDeliveryDate(orders) }
}

// Active orders first: a ticket is unique only among them.
function withTicket(orders: Order[], ticket: string): Order[] {
  const matches = orders.filter((order) => order.ticket === ticket)
  return [...matches.filter(isActive), ...matches.filter((order) => !isActive(order))]
}

function finishedNewestFirst(orders: Order[]): Order[] {
  return orders
    .filter((order) => !isActive(order))
    .sort((first, second) => second.deliveryDate.localeCompare(first.deliveryDate))
}

// Earliest delivery first, so what is due today is on top.
function activeByDeliveryDate(orders: Order[]): Order[] {
  return orders
    .filter(isActive)
    .sort((first, second) => first.deliveryDate.localeCompare(second.deliveryDate))
}
