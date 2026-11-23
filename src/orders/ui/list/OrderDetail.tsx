import { useState } from 'react'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import { Button } from '../../../shared/ui/atoms/Button'
import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from '../../../shared/ui/atoms/button-classes'
import { Icon } from '../../../shared/ui/atoms/Icon'
import { ConfirmPanel } from '../../../shared/ui/molecules/ConfirmPanel'
import { formatDayLabel, formatPesos } from '../../../shared/ui/format'
import {
  isActive,
  nextStatus,
  ORDER_STEPS,
  previousStatus,
  stepOf,
  type Order,
  type OrderStatus,
  type OrderStep,
} from '../../domain/order'
import { ACTIONS_TO_REACH, STATUS_LABELS, STEP_LABELS } from '../order-labels'
import { readyNoticeLink } from '../ready-notice'

export type MoveOrder = (order: Order, status: OrderStatus) => Promise<void>

type OrderDetailProps = {
  // undefined until the admin chooses an order.
  order: Order | undefined
  today: CalendarDate
  onMove: MoveOrder
  onClose: () => void
}

// Beside the list it waits with a hint; on the phone it only shows once an order is chosen.
export function OrderDetail({ order, today, onMove, onClose }: OrderDetailProps) {
  return (
    <section
      aria-label="Detalle del pedido"
      className={`flex min-w-0 flex-col gap-space-md @3xl:flex-[1_1_25rem] ${order ? '' : '@max-3xl:hidden'}`}
    >
      {order ? (
        <ChosenOrder order={order} today={today} onMove={onMove} onClose={onClose} />
      ) : (
        <p className="rounded-xl bg-surface-container-lowest p-6 text-on-surface-variant">
          Elige un pedido para ver su detalle.
        </p>
      )}
    </section>
  )
}

type ChosenOrderProps = {
  order: Order
  today: CalendarDate
  onMove: MoveOrder
  onClose: () => void
}

// A finished order is read only: its ticket has ended.
function ChosenOrder({ order, today, onMove, onClose }: ChosenOrderProps) {
  return (
    <>
      {/* Visible only when the detail is its own screen; focusing it there scrolls the screen to its top. */}
      <Button icon="chevron_left" onClick={onClose} autoFocus className="self-start @3xl:hidden">
        Volver a la agenda
      </Button>
      <div className="flex flex-col gap-5 rounded-[22px] bg-surface-container-lowest p-6 shadow-card">
        <OrderHeader order={order} />
        {order.status !== 'cancelled' && <OrderProgress current={stepOf(order.status)} />}
        {isActive(order) && <MoveForward order={order} onMove={onMove} />}
      </div>
      <OrderFacts order={order} today={today} />
      {isActive(order) && <StepBackOrCancel order={order} onMove={onMove} />}
    </>
  )
}

function OrderHeader({ order }: { order: Order }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="self-start rounded-lg bg-fill px-2.5 py-1 text-body-md font-extrabold tracking-wide tabular-nums text-on-surface">
        Ticket {order.ticket}
      </span>
      <h2 className="mt-1 text-headline-lg text-on-surface">{order.clientName}</h2>
      <p className="text-body-md font-semibold text-on-surface-variant">{order.work}</p>
      <p className="mt-2 text-headline-md text-on-surface">{STATUS_LABELS[order.status]}</p>
    </div>
  )
}

// Done and current steps are filled; the current one's label is also bold and marked as
// the current step, so the state never depends on the bars alone.
function OrderProgress({ current }: { current: OrderStep }) {
  const currentIndex = ORDER_STEPS.indexOf(current)

  return (
    <ol aria-label="Avance del pedido" className="grid grid-cols-4 gap-1.5">
      {ORDER_STEPS.map((step, index) => (
        <li
          key={step}
          aria-current={index === currentIndex ? 'step' : undefined}
          className="flex flex-col gap-1.5"
        >
          <span
            aria-hidden="true"
            className={`h-1.5 rounded-full ${index <= currentIndex ? 'bg-primary' : 'bg-outline-variant'}`}
          />
          <span
            className={`text-label-lg ${index === currentIndex ? 'font-extrabold text-on-surface' : 'font-medium text-on-surface-variant'}`}
          >
            {STEP_LABELS[step]}
          </span>
        </li>
      ))}
    </ol>
  )
}

// Delivering ends the order, so it asks first; the other steps can be undone.
function MoveForward({ order, onMove }: { order: Order; onMove: MoveOrder }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const next = nextStatus(order.status)
  if (next === undefined) return null

  if (isConfirming) {
    return (
      <ConfirmPanel
        tone="neutral"
        question={`¿Entregar el pedido de ${order.clientName}?`}
        confirmLabel="Sí, entregar el pedido"
        keepLabel="No, todavía no"
        onConfirm={() => onMove(order, 'delivered')}
        onKeep={() => setIsConfirming(false)}
      />
    )
  }

  const goForward = () => (next === 'delivered' ? setIsConfirming(true) : onMove(order, next))

  return (
    <div className="flex flex-col gap-space-sm">
      <Button variant="primary" icon="check" onClick={goForward}>
        {ACTIONS_TO_REACH[next]}
      </Button>
      {order.status === 'ready' && <ReadyNotice order={order} />}
    </div>
  )
}

// Only a plain ready order: a client on the way already knows.
function ReadyNotice({ order }: { order: Order }) {
  const href = readyNoticeLink(order)
  if (href === undefined) {
    return (
      <p className="text-center text-body-md font-semibold text-on-surface-variant">
        No dejó WhatsApp para avisarle.
      </p>
    )
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.secondary}`}
    >
      <Icon name="chat" />
      Avisar por WhatsApp
    </a>
  )
}

function OrderFacts({ order, today }: { order: Order; today: CalendarDate }) {
  const { deliveryDate, finalPriceMxn } = order

  return (
    <dl className="flex flex-col rounded-xl bg-surface-container-lowest">
      <Fact term="Entrega">{formatDayLabel(deliveryDate, deliveryDate === today)}</Fact>
      <Fact term="Total, se paga en el taller">{formatPesos(finalPriceMxn)}</Fact>
    </dl>
  )
}

function Fact({ term, children }: { term: string; children: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-separator px-5 py-3.5 first:border-t-0">
      <dt className="text-body-lg font-medium text-on-surface">{term}</dt>
      <dd className="text-right text-title-md font-extrabold tabular-nums text-on-surface">{children}</dd>
    </div>
  )
}

function StepBackOrCancel({ order, onMove }: { order: Order; onMove: MoveOrder }) {
  const [isConfirming, setIsConfirming] = useState(false)
  const previous = previousStatus(order.status)

  if (isConfirming) {
    return (
      <ConfirmPanel
        question={`¿Cancelar el pedido de ${order.clientName}?`}
        confirmLabel="Sí, cancelar el pedido"
        keepLabel="No, seguir con el pedido"
        onConfirm={() => onMove(order, 'cancelled')}
        onKeep={() => setIsConfirming(false)}
      />
    )
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      {previous && (
        <Button icon="undo" onClick={() => onMove(order, previous)} className="flex-[1_1_auto] whitespace-nowrap">
          Regresar a {STEP_LABELS[previous]}
        </Button>
      )}
      <Button
        variant="subtleDanger"
        icon="close"
        onClick={() => setIsConfirming(true)}
        className="flex-[1_1_auto] whitespace-nowrap"
      >
        Cancelar pedido
      </Button>
    </div>
  )
}
