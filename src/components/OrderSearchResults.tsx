import { orderKey, type Order } from '../utils/order'
import { FinishedNotice } from './FinishedNotice'
import { OrderDetail, type MoveOrder } from './OrderDetail'
import { noOrderWithTicket, SEARCH_RESULTS_LABEL, withTicket } from '../utils/order-listing'
import { OrderRows } from './OrderRows'
import type { CalendarDate } from '../utils/calendar-date'
import { useChosenDetail } from '../hooks/useChosenDetail'

type OrderSearchResultsProps = {
  // undefined while the orders load.
  orders: Order[] | undefined
  ticket: string
  today: CalendarDate
  onMove: MoveOrder
  onClose: () => void
}

// The orders with that ticket, whatever the filter, beside the chosen one's detail.
export function OrderSearchResults({ orders, ticket, today, onMove, onClose }: OrderSearchResultsProps) {
  const { chosenKey, notice, choose, movingWithNotice } = useChosenDetail()
  if (orders === undefined) return <p className="mt-space-lg text-on-surface-variant">Cargando los pedidos…</p>

  const results = withTicket(orders, ticket)
  const chosen = results.find((order) => orderKey(order) === chosenKey)
  const hiddenBesideDetail = chosen ? '@max-3xl:hidden' : ''

  return (
    <div className="mt-space-lg flex flex-col gap-space-lg">
      <FinishedNotice notice={notice} />
      <div className="flex flex-col gap-7 @3xl:flex-row @3xl:items-start">
        <OrderRows
          label={SEARCH_RESULTS_LABEL}
          orders={results}
          emptyText={noOrderWithTicket(ticket)}
          chosen={chosen}
          onChoose={(order) => choose(orderKey(order))}
          onCloseSearch={onClose}
          className={hiddenBesideDetail}
        />
        {results.length > 0 && (
          <OrderDetail
            key={chosenKey}
            order={chosen}
            today={today}
            onMove={movingWithNotice(onMove)}
            onClose={() => choose(undefined)}
          />
        )}
      </div>
    </div>
  )
}
