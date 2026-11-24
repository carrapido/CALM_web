import { useState } from 'react'
import type { AgendaRepository } from '../../../agenda/application/agenda-repository'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import { useQuery } from '../../../shared/ui/useQuery'
import { pendingAppointments } from '../../application/appointments-awaiting-order'
import type { OrdersRepository } from '../../application/orders-repository'
import { isActive, type Order, type OrderStatus } from '../../domain/order'
import { withTicket, workshopCounts } from './order-listing'
import { OrdersView, type OrderListing, type OrdersFilter } from './OrdersView'

type OrdersContainerProps = {
  repository: OrdersRepository
  agendaRepository: AgendaRepository
  today: CalendarDate
}

export function OrdersContainer({ repository, agendaRepository, today }: OrdersContainerProps) {
  const { data: orders, reload } = useQuery('orders', () => repository.orders())
  const [filter, setFilter] = useState<OrdersFilter>('workshop')
  // Loaded only when the admin asks for them, so the workshop list costs no agenda read.
  const { data: appointments } = useQuery(filter === 'appointments' ? 'pending-appointments' : 'none', () =>
    filter === 'appointments' ? pendingAppointments(agendaRepository, repository, today) : Promise.resolve([]),
  )
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
      appointments={appointments}
      onFilterChange={changeFilter}
      onSearch={setSearchedTicket}
      onCloseSearch={() => setSearchedTicket(undefined)}
      onMove={moveOrder}
    />
  )
}

// A search shows every order with that ticket, whatever the filter.
function listingOf(orders: Order[], filter: OrdersFilter, searchedTicket: string | undefined): OrderListing {
  if (searchedTicket !== undefined) {
    return { kind: 'search', ticket: searchedTicket, orders: withTicket(orders, searchedTicket) }
  }
  if (filter === 'finished') return { kind: 'finished', orders: finishedNewestFirst(orders) }
  if (filter === 'appointments') return { kind: 'appointments', orders: [] }
  return { kind: 'workshop', orders: activeByDeliveryDate(orders) }
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
