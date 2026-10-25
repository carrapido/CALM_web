import { addDays, type CalendarDate } from '../../shared/domain/calendar-date'
import type { Order } from '../domain/order'

// Demo data for the in-memory adapter, dated around today; tickets differ from the
// sample agenda's so no active ticket repeats.
export function sampleOrders(today: CalendarDate): Order[] {
  return [
    {
      ticket: '7720',
      clientName: 'Carlos Ruiz',
      work: 'Cambio de cierre de chamarra',
      finalPriceMxn: 150,
      deliveryDate: today,
      status: 'ready',
    },
    {
      ticket: '5512',
      clientName: 'Lucía Gómez',
      whatsapp: '9985551234',
      work: 'Ajuste de vestido de novia',
      finalPriceMxn: 900,
      deliveryDate: addDays(today, 3),
      status: 'inProgress',
    },
    {
      ticket: '2290',
      clientName: 'Rosa Chan',
      whatsapp: '9987654321',
      work: 'Bastilla de 2 pantalones',
      finalPriceMxn: 200,
      deliveryDate: addDays(today, 5),
      status: 'received',
    },
    {
      ticket: '3301',
      clientName: 'Elena Díaz',
      work: 'Dobladillo de falda',
      finalPriceMxn: 120,
      deliveryDate: addDays(today, -4),
      status: 'delivered',
    },
  ]
}
