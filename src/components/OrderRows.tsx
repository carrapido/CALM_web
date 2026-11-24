import { Button } from './Button'
import { Icon } from './Icon'
import { isReadyForPickup, orderKey, type Order } from '../utils/order'
import { STATUS_LABELS } from '../utils/order-labels'

type OrderRowsProps = {
  // Names the list, e.g. "Pedidos en el taller".
  label: string
  orders: Order[]
  emptyText: string
  chosen: Order | undefined
  onChoose: (order: Order) => void
  // Only search results can be closed.
  onCloseSearch: (() => void) | undefined
  className: string
}

// An inset grouped list. Rows carry no delivery date (the user's canvas edit): the
// detail has it, and the list keeps the earliest delivery on top.
export function OrderRows({
  label,
  orders,
  emptyText,
  chosen,
  onChoose,
  onCloseSearch,
  className,
}: OrderRowsProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-space-md @3xl:flex-[1_1_22.5rem] ${className}`}>
      {orders.length === 0 ? (
        <p className="rounded-xl bg-surface-container-lowest p-6 text-title-md text-on-surface">{emptyText}</p>
      ) : (
        <ol aria-label={label} className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest">
          {orders.map((order) => (
            <li key={orderKey(order)} className="border-t border-separator first:border-t-0">
              <OrderRow order={order} isChosen={order === chosen} onChoose={onChoose} />
            </li>
          ))}
        </ol>
      )}
      {onCloseSearch && (
        <Button icon="close" onClick={onCloseSearch} className="@3xl:self-start">
          Cerrar búsqueda
        </Button>
      )}
    </div>
  )
}

type OrderRowProps = {
  order: Order
  isChosen: boolean
  onChoose: (order: Order) => void
}

function OrderRow({ order, isChosen, onChoose }: OrderRowProps) {
  const chosenClasses = isChosen ? 'bg-surface-container-low shadow-[inset_0_0_0_2px_var(--color-primary)]' : ''

  return (
    <button
      type="button"
      aria-current={isChosen ? 'true' : undefined}
      onClick={() => onChoose(order)}
      className={`flex min-h-21 w-full items-center gap-3.5 px-5 py-4 text-left transition-colors hover:bg-surface-container-low ${chosenClasses}`}
    >
      {/* On the phone the chip goes under the work, so the client and the work keep the width. */}
      <span className="flex min-w-0 flex-1 flex-col items-start gap-1.5 @3xl:flex-row @3xl:items-center @3xl:gap-3.5">
        <span className="flex min-w-0 flex-col gap-0.5 @3xl:flex-1">
          <span className="text-body-md font-bold tabular-nums text-on-surface-variant">
            Ticket {order.ticket} · {order.clientName}
          </span>
          <span className="text-title-md font-bold text-on-surface">{order.work}</span>
        </span>
        <StatusChip order={order} />
      </span>
      {/* On the phone the row opens its own screen, so it carries the disclosure chevron.
          The wrapper hides it: Google's unlayered icon CSS would override a hidden class on the glyph. */}
      <span className="-mr-1.5 text-on-surface-variant @3xl:hidden">
        <Icon name="chevron_right" />
      </span>
    </button>
  )
}

// Green once the client can pick the order up; the word carries the state, not the color.
function StatusChip({ order }: { order: Order }) {
  const colorClasses = isReadyForPickup(order)
    ? 'bg-success-container text-on-success-container'
    : 'bg-fill text-on-surface'

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-label-lg font-extrabold ${colorClasses}`}>
      {STATUS_LABELS[order.status]}
    </span>
  )
}
