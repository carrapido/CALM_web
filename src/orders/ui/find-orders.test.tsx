import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { activeOrders, button, cardsIn, renderOrders } from './orders-test-kit'

describe('Find an order by ticket', () => {
  it('shows a finished order found by its ticket', async () => {
    renderOrders()
    await activeOrders()

    await searchTicket('3301')

    const results = await screen.findByRole('list', { name: 'Resultados de la búsqueda' })
    expect(results).toHaveTextContent('Elena Díaz')
    expect(results).toHaveTextContent('Entregado')
  })

  it('says when no order has that ticket', async () => {
    renderOrders()
    await activeOrders()

    await searchTicket('9999')

    expect(await screen.findByText('No hay ningún pedido con el ticket 9999')).toBeInTheDocument()
  })

  it('asks for the 4 digits of the ticket', async () => {
    renderOrders()
    await activeOrders()

    await searchTicket('33')

    expect(await screen.findByText('Escribe los 4 números del ticket')).toBeInTheDocument()
  })
})

describe('Finished orders', () => {
  it('lists delivered and cancelled orders, newest first, read only', async () => {
    renderOrders()
    await activeOrders()

    await userEvent.click(button('Ver terminados'))

    const finished = await screen.findByRole('list', { name: 'Pedidos terminados' })
    const cards = cardsIn(finished)
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Elena Díaz')
    expect(cards[0]).toHaveTextContent('Entregado')
    expect(cards[1]).toHaveTextContent('Sofía Ramos')
    expect(cards[1]).toHaveTextContent('Cancelado')
    expect(within(finished).queryByRole('button')).not.toBeInTheDocument()
  })
})

async function searchTicket(ticket: string) {
  await userEvent.type(screen.getByRole('textbox', { name: 'Buscar por ticket' }), ticket)
  await userEvent.click(button('Buscar'))
}
