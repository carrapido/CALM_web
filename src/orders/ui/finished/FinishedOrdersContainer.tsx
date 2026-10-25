import { Button } from '../../../shared/ui/atoms/Button'
import { useQuery } from '../../../shared/ui/useQuery'
import type { OrdersRepository } from '../../application/orders-repository'
import { isActive, type Order } from '../../domain/order'
import { OrderList } from '../OrderList'

type FinishedOrdersContainerProps = {
  repository: OrdersRepository
  onBack: () => void
}

export function FinishedOrdersContainer({ repository, onBack }: FinishedOrdersContainerProps) {
  const { data: orders } = useQuery('orders', () => repository.orders())

  return (
    <div className="mt-space-lg flex flex-col gap-space-lg">
      <h2 className="text-headline-lg text-on-surface">Pedidos terminados</h2>
      <Button icon="chevron_left" onClick={onBack} className="sm:self-start">
        Volver a pedidos activos
      </Button>
      {orders === undefined ? (
        <p className="text-on-surface-variant">Cargando los pedidos…</p>
      ) : (
        <OrderList label="Pedidos terminados" orders={finishedNewestFirst(orders)} />
      )}
    </div>
  )
}

function finishedNewestFirst(orders: Order[]): Order[] {
  return orders
    .filter((order) => !isActive(order))
    .sort((first, second) => second.deliveryDate.localeCompare(first.deliveryDate))
}
