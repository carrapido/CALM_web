import type { OrderStatus, OrderStep } from '../domain/order'

// Short labels keep the 4-step progress on one line at phone width.
export const STEP_LABELS: Record<OrderStep, string> = {
  received: 'Recibido',
  inProgress: 'En proceso',
  ready: 'Listo',
  delivered: 'Entregado',
}

// One word per state, the same in a row's chip and in the detail's title.
export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: 'Recibido',
  inProgress: 'En proceso',
  ready: 'Listo para recoger',
  onTheWay: 'Cliente en camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
}

// The button that moves an order forward is named after what the admin does.
export const ACTIONS_TO_REACH: Record<OrderStep, string> = {
  received: 'Marcar como recibido',
  inProgress: 'Empezar a trabajar',
  ready: 'Marcar como listo',
  delivered: 'Marcar como entregado',
}
