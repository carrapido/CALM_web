import { useState } from 'react'
import { Button } from '../../shared/ui/atoms/Button'
import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from '../../shared/ui/atoms/button-classes'
import { Icon } from '../../shared/ui/atoms/Icon'
import { ConfirmPanel } from '../../shared/ui/molecules/ConfirmPanel'
import { formatLongDate, formatPesos } from '../../shared/ui/format'
import {
  isActive,
  nextStatus,
  previousStatus,
  type Order,
  type OrderStatus,
} from '../domain/order'
import { ACTIONS_TO_REACH, STEP_LABELS } from './order-labels'
import { OrderStepper } from './OrderStepper'
import { readyNoticeLink } from './ready-notice'

export type MoveOrder = (order: Order, status: OrderStatus) => void

type OrderCardProps = {
  order: Order
  // Without it the card is read only, as in search results and finished orders.
  onMove?: MoveOrder
}

export function OrderCard({ order, onMove }: OrderCardProps) {
  return (
    <article className="flex flex-col gap-space-sm rounded-xl border-2 border-primary bg-surface-container-lowest p-space-md">
      <OrderDetails order={order} />
      {order.status === 'cancelled' ? (
        <p className="rounded-lg bg-error-container p-space-sm text-center text-title-md text-on-error-container">
          Cancelado
        </p>
      ) : (
        <OrderStepper current={order.status} />
      )}
      {onMove && isActive(order) && <OrderControls order={order} onMove={onMove} />}
    </article>
  )
}

function OrderDetails({ order }: { order: Order }) {
  const { ticket, clientName, work, finalPriceMxn, deliveryDate } = order

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <span className="rounded bg-secondary-container px-space-sm py-space-xs text-title-md tabular-nums text-on-secondary-fixed">
          Ticket {ticket}
        </span>
        <span className="text-title-md text-on-surface">Entrega: {formatLongDate(deliveryDate)}</span>
      </div>
      <h3 className="text-headline-sm text-on-surface">{clientName}</h3>
      <p className="text-on-surface">{work}</p>
      <p className="text-on-surface-variant">Precio final: {formatPesos(finalPriceMxn)}</p>
    </>
  )
}

type Confirmation = 'deliver' | 'cancel' | undefined

function OrderControls({ order, onMove }: { order: Order; onMove: MoveOrder }) {
  const [confirmation, setConfirmation] = useState<Confirmation>()
  const next = nextStatus(order.status)
  const previous = previousStatus(order.status)

  // Delivering ends the order, so it asks first; the other steps can be undone.
  const goForward = () => {
    if (next === 'delivered') setConfirmation('deliver')
    else if (next) onMove(order, next)
  }

  if (confirmation === 'deliver') {
    return (
      <ConfirmPanel
        tone="neutral"
        question={`¿Entregar el pedido de ${order.clientName}?`}
        confirmLabel="Sí, entregar el pedido"
        keepLabel="No, todavía no"
        onConfirm={() => onMove(order, 'delivered')}
        onKeep={() => setConfirmation(undefined)}
      />
    )
  }
  if (confirmation === 'cancel') {
    return (
      <ConfirmPanel
        question={`¿Cancelar el pedido de ${order.clientName}?`}
        confirmLabel="Sí, cancelar el pedido"
        keepLabel="No, seguir con el pedido"
        onConfirm={() => onMove(order, 'cancelled')}
        onKeep={() => setConfirmation(undefined)}
      />
    )
  }

  return (
    <div className="flex flex-col gap-space-sm">
      {order.status === 'ready' && <ReadyNotice order={order} />}
      {next && (
        <Button variant="primary" icon="arrow_forward" onClick={goForward}>
          {ACTIONS_TO_REACH[next]}
        </Button>
      )}
      <div className="grid gap-space-sm sm:grid-cols-2">
        {previous && (
          <Button icon="undo" onClick={() => onMove(order, previous)}>
            Regresar a {STEP_LABELS[previous]}
          </Button>
        )}
        <Button icon="close" onClick={() => setConfirmation('cancel')}>
          Cancelar pedido
        </Button>
      </div>
    </div>
  )
}

function ReadyNotice({ order }: { order: Order }) {
  const href = readyNoticeLink(order)
  if (href === undefined) return <p className="text-on-surface-variant">Sin WhatsApp</p>

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.secondary}`}
    >
      <Icon name="chat" className="text-[24px]" />
      Avisar por WhatsApp
    </a>
  )
}
