import { waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { Order } from '../domain/order'
import { currentStep, orderCard, renderOrders } from './orders-test-kit'

// The client taps "Voy en camino" in the app, which moves a ready order to onTheWay.
const ON_THE_WAY: Order = {
  ticket: '7720',
  clientName: 'Carlos Ruiz',
  whatsapp: '9981234567',
  work: 'Cambio de cierre de chamarra',
  finalPriceMxn: 150,
  deliveryDate: '2026-10-25',
  status: 'onTheWay',
}

describe('Client on the way', () => {
  it('tells the admin the client is on the way while the order stays on Listo', async () => {
    renderOrders({ orders: [ON_THE_WAY] })

    const carlos = await orderCard('Carlos Ruiz')

    expect(carlos).toHaveTextContent('Cliente en camino')
    expect(currentStep(carlos)).toBe('Listo')
  })

  it('lets the admin deliver the order without a WhatsApp notice', async () => {
    renderOrders({ orders: [ON_THE_WAY] })

    const carlos = await orderCard('Carlos Ruiz')

    expect(within(carlos).getByRole('button', { name: 'Marcar como entregado' })).toBeInTheDocument()
    expect(within(carlos).queryByRole('link', { name: 'Avisar por WhatsApp' })).not.toBeInTheDocument()
  })

  it('goes back to a plain ready order', async () => {
    renderOrders({ orders: [ON_THE_WAY] })

    await userEvent.click(within(await orderCard('Carlos Ruiz')).getByRole('button', { name: 'Regresar a Listo' }))

    await waitFor(async () => expect(await orderCard('Carlos Ruiz')).not.toHaveTextContent('Cliente en camino'))
    expect(currentStep(await orderCard('Carlos Ruiz'))).toBe('Listo')
  })
})
