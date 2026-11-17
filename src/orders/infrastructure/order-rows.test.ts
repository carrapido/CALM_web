import { describe, expect, it } from 'vitest'
import { orderColumnsOf, orderFromRow } from './order-rows'

describe('Order rows', () => {
  it('reads a walk-in order without an appointment', () => {
    expect(
      orderFromRow({
        ticket: '7720',
        work: 'Cambio de cierre de chamarra',
        final_price_mxn: 150,
        delivery_date: '2026-11-17',
        status: 'ready',
        client: { name: 'Carlos Ruiz', phone: null },
        appointment: null,
      }),
    ).toEqual({
      ticket: '7720',
      clientName: 'Carlos Ruiz',
      work: 'Cambio de cierre de chamarra',
      finalPriceMxn: 150,
      deliveryDate: '2026-11-17',
      status: 'ready',
    })
  })

  it('reads the appointment an order came from, with its WhatsApp number and time', () => {
    const order = orderFromRow({
      ticket: '3301',
      work: 'Dobladillo de falda',
      final_price_mxn: 120,
      delivery_date: '2026-11-13',
      status: 'delivered',
      client: { name: 'Elena Díaz', phone: '9981112233' },
      appointment: { scheduled_date: '2026-11-13', scheduled_time: '10:00:00' },
    })

    expect(order.whatsapp).toBe('9981112233')
    expect(order.appointment).toEqual({ date: '2026-11-13', time: '10:00' })
  })

  it('refuses a status the domain does not know, instead of showing it', () => {
    expect(() =>
      orderFromRow({
        ticket: '1111',
        work: 'Parche',
        final_price_mxn: 40,
        delivery_date: '2026-11-17',
        status: 'lost',
        client: { name: 'Nadie', phone: null },
        appointment: null,
      }),
    ).toThrow('Unknown order status: lost')
  })

  it('writes the columns the panel can change on an order', () => {
    expect(
      orderColumnsOf({
        ticket: '5512',
        clientName: 'Lucía Gómez',
        work: 'Ajuste de vestido de novia',
        finalPriceMxn: 900,
        deliveryDate: '2026-11-20',
        status: 'inProgress',
      }),
    ).toEqual({
      work: 'Ajuste de vestido de novia',
      final_price_mxn: 900,
      delivery_date: '2026-11-20',
      status: 'inProgress',
    })
  })
})
