import { useState } from 'react'
import type { Appointment } from '../../../agenda/domain/appointment'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import { SegmentedControl } from '../../../shared/ui/molecules/SegmentedControl'
import { formatCount } from '../../../shared/ui/format'
import { isActive, orderKey, type Order, type OrderStatus } from '../../domain/order'
import { OrderDetail, type MoveOrder } from './OrderDetail'
import { AppointmentRows } from './AppointmentRows'
import { OrderRows } from './OrderRows'
import { TicketSearch } from './TicketSearch'

// The workshop holds the clients' clothes; pending appointments have not brought them yet.
export type OrdersFilter = 'workshop' | 'appointments' | 'finished'

export type OrderListing =
  | { kind: OrdersFilter; orders: Order[] }
  | { kind: 'search'; ticket: string; orders: Order[] }

export type WorkshopCounts = {
  inWorkshop: number
  ready: number
}

type OrdersViewProps = {
  today: CalendarDate
  // Both undefined while loading.
  counts: WorkshopCounts | undefined
  listing: OrderListing | undefined
  // Undefined while loading, or while another list is shown.
  appointments: Appointment[] | undefined
  filter: OrdersFilter
  onFilterChange: (filter: OrdersFilter) => void
  onSearch: (ticket: string) => void
  onCloseSearch: () => void
  onMove: MoveOrder
}

const FILTERS = [
  { value: 'workshop', label: 'En el taller' },
  { value: 'appointments', label: 'Citas pendientes' },
  { value: 'finished', label: 'Terminados' },
] as const

// The orders beside the chosen one's detail. Below the split width (the @container's
// @3xl) the detail is a screen of its own: the toolbar and the list step aside.
export function OrdersView({
  today,
  counts,
  listing,
  appointments,
  filter,
  onFilterChange,
  onSearch,
  onCloseSearch,
  onMove,
}: OrdersViewProps) {
  const [chosenKey, setChosenKey] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const chosen = listing?.orders.find((order) => orderKey(order) === chosenKey)
  const hiddenBesideDetail = chosen ? '@max-3xl:hidden' : ''

  // Another list starts with nothing chosen and no notice about the last one.
  const showAnotherList = (change: () => void) => {
    setChosenKey(undefined)
    setNotice(undefined)
    change()
  }

  const choose = (order: Order) => {
    setChosenKey(orderKey(order))
    setNotice(undefined)
  }

  // A finished order leaves the list, so the detail closes and a notice says where it went.
  const move = (order: Order, status: OrderStatus) =>
    onMove(order, status).then(() => {
      if (isActive({ ...order, status })) return
      setChosenKey(undefined)
      setNotice(finishedNotice(order, status))
    })

  return (
    <div className="@container mt-space-md flex flex-col gap-space-lg">
      <div className={`flex flex-col gap-space-md ${hiddenBesideDetail}`}>
        {counts && (
          <p className="text-body-md font-bold text-on-surface-variant">{workshopSummary(counts)}</p>
        )}
        <div className="flex flex-wrap items-start gap-3">
          <SegmentedControl
            label="Qué pedidos ver"
            options={FILTERS}
            value={filter}
            onChange={(newFilter) => showAnotherList(() => onFilterChange(newFilter))}
          />
          <TicketSearch onSearch={(ticket) => showAnotherList(() => onSearch(ticket))} />
        </div>
      </div>
      <FinishedNotice notice={notice} />
      {listing?.kind === 'appointments' ? (
        appointments === undefined ? (
          <p className="text-on-surface-variant">Cargando las citas…</p>
        ) : (
          <AppointmentRows appointments={appointments} today={today} />
        )
      ) : listing === undefined ? (
        <p className="text-on-surface-variant">Cargando los pedidos…</p>
      ) : (
        <div className="flex flex-col gap-7 @3xl:flex-row @3xl:items-start">
          <OrderRows
            label={LIST_LABELS[listing.kind]}
            orders={listing.orders}
            emptyText={emptyText(listing)}
            chosen={chosen}
            onChoose={choose}
            onCloseSearch={listing.kind === 'search' ? () => showAnotherList(onCloseSearch) : undefined}
            className={hiddenBesideDetail}
          />
          {listing.orders.length > 0 && (
            <OrderDetail
              key={chosenKey}
              order={chosen}
              today={today}
              onMove={move}
              onClose={() => setChosenKey(undefined)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function finishedNotice({ clientName }: Order, status: OrderStatus): string {
  const outcome = status === 'delivered' ? 'entregado' : 'cancelado'
  return `Pedido de ${clientName} ${outcome}. Lo encuentras en Terminados.`
}

function workshopSummary({ inWorkshop, ready }: WorkshopCounts): string {
  const summary = `${inWorkshop} en el taller`
  if (ready === 0) return summary
  return `${summary} · ${formatCount(ready, 'listo para recoger', 'listos para recoger')}`
}

// The live region stays in the page, empty, so the notice is announced when it appears.
function FinishedNotice({ notice }: { notice: string | undefined }) {
  return (
    <p
      role="status"
      className={
        notice ? 'rounded-xl bg-success-container px-5 py-4 text-title-md text-on-success-container' : 'sr-only'
      }
    >
      {notice}
    </p>
  )
}

const LIST_LABELS: Record<OrderListing['kind'], string> = {
  workshop: 'Pedidos en el taller',
  appointments: 'Citas pendientes',
  finished: 'Pedidos terminados',
  search: 'Resultados de la búsqueda',
}

function emptyText(listing: OrderListing): string {
  if (listing.kind === 'search') return `No hay ningún pedido con el ticket ${listing.ticket}`
  return listing.kind === 'finished' ? 'No hay pedidos terminados.' : 'No hay pedidos en el taller.'
}
