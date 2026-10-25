import { Button } from '../../../shared/ui/atoms/Button'
import type { Order } from '../../domain/order'
import type { MoveOrder } from '../OrderCard'
import { OrderList } from '../OrderList'
import { TicketSearch } from './TicketSearch'

export type TicketSearchResult = {
  ticket: string
  orders: Order[]
}

type ActiveOrdersViewProps = {
  activeOrders: Order[] | undefined
  searchResult: TicketSearchResult | undefined
  onSearch: (ticket: string) => void
  onCloseSearch: () => void
  onNewOrder: () => void
  onShowFinished: () => void
  onMove: MoveOrder
}

export function ActiveOrdersView({
  activeOrders,
  searchResult,
  onSearch,
  onCloseSearch,
  onNewOrder,
  onShowFinished,
  onMove,
}: ActiveOrdersViewProps) {
  return (
    <div className="mt-space-lg flex flex-col gap-space-lg">
      <div className="grid gap-space-sm sm:flex">
        <Button variant="primary" icon="add" onClick={onNewOrder}>
          Nuevo pedido
        </Button>
        <Button icon="inventory_2" onClick={onShowFinished}>
          Ver terminados
        </Button>
      </div>
      <TicketSearch onSearch={onSearch} />
      {searchResult && <SearchResult result={searchResult} onClose={onCloseSearch} />}
      <h2 className="text-headline-lg text-on-surface">Pedidos activos</h2>
      <ActiveOrderList orders={activeOrders} onMove={onMove} />
    </div>
  )
}

function SearchResult({ result, onClose }: { result: TicketSearchResult; onClose: () => void }) {
  return (
    <section className="flex flex-col gap-space-sm rounded-xl bg-surface-container p-space-md">
      {result.orders.length === 0 ? (
        <p className="text-title-md text-on-surface">
          No hay ningún pedido con el ticket {result.ticket}
        </p>
      ) : (
        <OrderList label="Resultados de la búsqueda" orders={result.orders} />
      )}
      <Button icon="close" onClick={onClose} className="sm:self-start">
        Cerrar búsqueda
      </Button>
    </section>
  )
}

function ActiveOrderList({ orders, onMove }: { orders: Order[] | undefined; onMove: MoveOrder }) {
  if (orders === undefined) return <p className="text-on-surface-variant">Cargando los pedidos…</p>
  if (orders.length === 0) return <p className="text-on-surface-variant">No hay pedidos activos.</p>
  return <OrderList label="Pedidos activos" orders={orders} onMove={onMove} />
}
