import { formatPesos } from '../../shared/ui/format'
import { whatsappChatLink } from '../../shared/ui/whatsapp-link'
import type { Order } from '../domain/order'

export function readyNoticeLink(order: Order): string | undefined {
  if (order.whatsapp === undefined) return undefined
  return whatsappChatLink(order.whatsapp, readyNoticeText(order))
}

function readyNoticeText({ clientName, ticket, finalPriceMxn }: Order): string {
  return `Hola ${clientName}, tu pedido con ticket ${ticket} ya está listo. Total: ${formatPesos(finalPriceMxn)}. Puedes pasar a recogerlo.`
}
