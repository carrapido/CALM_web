import type { OrderStep } from '../domain/order'

// Short labels keep the 4-step stepper on one line at phone width.
export const STEP_LABELS: Record<OrderStep, string> = {
  received: 'Recibido',
  inProgress: 'En proceso',
  ready: 'Listo',
  delivered: 'Entregado',
}

// The button that moves an order forward is named after what the admin does.
export const ACTIONS_TO_REACH: Record<OrderStep, string> = {
  received: 'Marcar como recibido',
  inProgress: 'Empezar a trabajar',
  ready: 'Marcar como listo',
  delivered: 'Marcar como entregado',
}
