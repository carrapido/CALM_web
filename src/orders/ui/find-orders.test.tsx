import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { button, currentStep, orderDetail, ordersInWorkshop, renderOrders, rowsIn } from './orders-test-kit'

describe('Find an order by ticket', () => {
  it('shows a finished order found by its ticket and opens its detail', async () => {
    renderOrders()
    await ordersInWorkshop()

    await searchTicket('3301')

    const results = await screen.findByRole('list', { name: 'Resultados de la búsqueda' })
    expect(results).toHaveTextContent('Elena Díaz')
    expect(results).toHaveTextContent('Entregado')
    await userEvent.click(within(results).getByRole('button', { name: /Elena Díaz/ }))
    expect(within(orderDetail()).getByRole('heading', { name: 'Elena Díaz' })).toBeInTheDocument()
  })

  it('says when no order has that ticket', async () => {
    renderOrders()
    await ordersInWorkshop()

    await searchTicket('9999')

    expect(await screen.findByText('No hay ningún pedido con el ticket 9999')).toBeInTheDocument()
  })

  it('asks for the 4 digits of the ticket', async () => {
    renderOrders()
    await ordersInWorkshop()

    await searchTicket('33')

    expect(await screen.findByText('Escribe los 4 números del ticket')).toBeInTheDocument()
  })

  it('brings the list back when the search is closed', async () => {
    renderOrders()
    await ordersInWorkshop()
    await searchTicket('3301')
    await screen.findByRole('list', { name: 'Resultados de la búsqueda' })

    await userEvent.click(button('Cerrar búsqueda'))

    expect(rowsIn(await ordersInWorkshop())).toHaveLength(2)
    expect(screen.queryByRole('list', { name: 'Resultados de la búsqueda' })).not.toBeInTheDocument()
  })
})

describe('Finished orders', () => {
  it('lists delivered and cancelled orders, newest first', async () => {
    renderOrders()
    await ordersInWorkshop()

    await userEvent.click(button('Terminados'))

    const rows = rowsIn(await screen.findByRole('list', { name: 'Pedidos terminados' }))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Elena Díaz')
    expect(rows[0]).toHaveTextContent('Entregado')
    expect(rows[1]).toHaveTextContent('Sofía Ramos')
    expect(rows[1]).toHaveTextContent('Cancelado')
    expect(button('Terminados')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a finished order read only', async () => {
    renderOrders()
    await ordersInWorkshop()
    await userEvent.click(button('Terminados'))
    const finished = await screen.findByRole('list', { name: 'Pedidos terminados' })

    await userEvent.click(within(finished).getByRole('button', { name: /Elena Díaz/ }))

    const detail = orderDetail()
    expect(currentStep(detail)).toBe('Entregado')
    const buttonNames = within(detail)
      .getAllByRole('button')
      .map((detailButton) => detailButton.textContent)
    expect(buttonNames).toHaveLength(1)
    expect(buttonNames[0]).toContain('Volver a pedidos')
  })
})

async function searchTicket(ticket: string) {
  await userEvent.type(screen.getByRole('textbox', { name: 'Buscar por ticket' }), ticket)
  await userEvent.click(button('Buscar'))
}
