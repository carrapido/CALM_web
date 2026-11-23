import { useState } from 'react'
import type { AgendaRepository } from '../../agenda/application/agenda-repository'
import { DayAgendaContainer } from '../../agenda/ui/day/DayAgendaContainer'
import { WeekAgendaContainer } from '../../agenda/ui/week/WeekAgendaContainer'
import type { OrdersRepository } from '../../orders/application/orders-repository'
import type { Order, OrderStatus } from '../../orders/domain/order'
import { workshopCounts, workshopSummary } from '../../orders/ui/list/order-listing'
import { TicketSearch } from '../../orders/ui/list/TicketSearch'
import { todayInCancun, type CalendarDate } from '../../shared/domain/calendar-date'
import { SegmentedControl } from '../../shared/ui/molecules/SegmentedControl'
import { useQuery } from '../../shared/ui/useQuery'
import type { CalendarFilter } from '../domain/calendar-entries'
import { MonthContainer } from './month/MonthContainer'
import { OrderSearchResults } from './OrderSearchResults'

export type CalendarView = 'month' | 'week' | 'day'

type CalendarScreenProps = {
  agendaRepository: AgendaRepository
  ordersRepository: OrdersRepository
  now: () => Date
  view: CalendarView
  date: CalendarDate
  onViewChange: (view: CalendarView) => void
  onDateChange: (date: CalendarDate) => void
}

// The toolbar over the chosen view. A ticket search replaces the view until it is closed.
export function CalendarScreen({
  agendaRepository,
  ordersRepository,
  now,
  view,
  date,
  onViewChange,
  onDateChange,
}: CalendarScreenProps) {
  const today = todayInCancun(now())
  const { data: orders, reload: reloadOrders } = useQuery('orders', () => ordersRepository.orders())
  const [filter, setFilter] = useState<CalendarFilter>({ show: 'all', orders: 'workshop' })
  const [searchedTicket, setSearchedTicket] = useState<string>()

  const moveOrder = (order: Order, status: OrderStatus) =>
    ordersRepository.updateActiveOrder({ ...order, status }).then(reloadOrders)

  const changeView = (newView: CalendarView) => {
    setSearchedTicket(undefined)
    onViewChange(newView)
  }

  const changeFilter = (newFilter: CalendarFilter) => {
    setSearchedTicket(undefined)
    setFilter(newFilter)
  }

  const openDay = (day: CalendarDate) => {
    onDateChange(day)
    changeView('day')
  }

  return (
    <div className="@container">
      <CalendarToolbar
        summary={orders && workshopSummary(workshopCounts(orders))}
        view={view}
        filter={filter}
        onViewChange={changeView}
        onFilterChange={changeFilter}
        onSearch={setSearchedTicket}
      />
      {searchedTicket !== undefined ? (
        <OrderSearchResults
          key={searchedTicket}
          orders={orders}
          ticket={searchedTicket}
          today={today}
          onMove={moveOrder}
          onClose={() => setSearchedTicket(undefined)}
        />
      ) : (
        <>
          {view === 'month' && (
            <MonthContainer
              repository={agendaRepository}
              ordersRepository={ordersRepository}
              orders={orders}
              filter={filter}
              now={now}
              date={date}
              onDateChange={onDateChange}
              onOpenDay={openDay}
              onMoveOrder={moveOrder}
            />
          )}
          {view === 'week' && (
            <WeekAgendaContainer repository={agendaRepository} now={now} date={date} onChooseDay={openDay} />
          )}
          {view === 'day' && (
            <DayAgendaContainer repository={agendaRepository} now={now} date={date} onDateChange={onDateChange} />
          )}
        </>
      )}
    </div>
  )
}

const VIEWS = [
  { value: 'month', label: 'Mes' },
  { value: 'week', label: 'Semana' },
  { value: 'day', label: 'Día' },
] as const

type CalendarToolbarProps = {
  // undefined while the orders load.
  summary: string | undefined
  view: CalendarView
  filter: CalendarFilter
  onViewChange: (view: CalendarView) => void
  onFilterChange: (filter: CalendarFilter) => void
  onSearch: (ticket: string) => void
}

// "Qué ver" only filters the month: the week and the day show the agenda as before.
function CalendarToolbar({ summary, view, filter, onViewChange, onFilterChange, onSearch }: CalendarToolbarProps) {
  return (
    <div className="mt-space-lg flex flex-col gap-space-md">
      {summary && <p className="text-body-md font-bold text-on-surface-variant">{summary}</p>}
      <div className="flex flex-wrap items-start gap-3">
        <SegmentedControl label="Vista" options={VIEWS} value={view} onChange={onViewChange} />
        {view === 'month' && <ShowFilter filter={filter} onChange={onFilterChange} />}
        <TicketSearch onSearch={onSearch} />
      </div>
    </div>
  )
}

const SHOW_OPTIONS = [
  { value: 'all', label: 'Todo' },
  { value: 'appointments', label: 'Citas' },
  { value: 'orders', label: 'Pedidos' },
] as const

const ORDERS_OPTIONS = [
  { value: 'workshop', label: 'En el taller' },
  { value: 'finished', label: 'Terminados' },
] as const

// Pedidos adds the choice the orders screen had: in the workshop or finished.
function ShowFilter({ filter, onChange }: { filter: CalendarFilter; onChange: (filter: CalendarFilter) => void }) {
  return (
    <>
      <SegmentedControl
        label="Qué ver"
        options={SHOW_OPTIONS}
        value={filter.show}
        onChange={(show) => onChange({ ...filter, show })}
      />
      {filter.show === 'orders' && (
        <SegmentedControl
          label="Qué pedidos ver"
          options={ORDERS_OPTIONS}
          value={filter.orders}
          onChange={(orders) => onChange({ ...filter, orders })}
        />
      )}
    </>
  )
}
