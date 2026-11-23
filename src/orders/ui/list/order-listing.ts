import { formatCount } from '../../../shared/ui/format'
import { isActive, isReadyForPickup, type Order, type OrderStatus } from '../../domain/order'

export type WorkshopCounts = {
  inWorkshop: number
  ready: number
}

export const SEARCH_RESULTS_LABEL = 'Resultados de la búsqueda'

export function workshopCounts(orders: Order[]): WorkshopCounts {
  const inWorkshop = orders.filter(isActive)
  return { inWorkshop: inWorkshop.length, ready: inWorkshop.filter(isReadyForPickup).length }
}

// "2 en el taller · 1 listo para recoger".
export function workshopSummary({ inWorkshop, ready }: WorkshopCounts): string {
  const summary = `${inWorkshop} en el taller`
  if (ready === 0) return summary
  return `${summary} · ${formatCount(ready, 'listo para recoger', 'listos para recoger')}`
}

// Active orders first: a ticket is unique only among them.
export function withTicket(orders: Order[], ticket: string): Order[] {
  const matches = orders.filter((order) => order.ticket === ticket)
  return [...matches.filter(isActive), ...matches.filter((order) => !isActive(order))]
}

export function noOrderWithTicket(ticket: string): string {
  return `No hay ningún pedido con el ticket ${ticket}`
}

// A finished order leaves the workshop, so the notice says where to find it.
export function finishedNotice({ clientName }: Order, status: OrderStatus): string {
  const outcome = status === 'delivered' ? 'entregado' : 'cancelado'
  return `Pedido de ${clientName} ${outcome}. Lo encuentras en Terminados.`
}
