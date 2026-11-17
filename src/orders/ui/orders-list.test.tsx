import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  button,
  CARLOS_READY,
  chooseOrder,
  currentStep,
  fact,
  LUCIA_RECEIVED,
  orderDetail,
  ordersInWorkshop,
  renderOrders,
  rowOf,
  rowsIn,
} from './orders-test-kit'

describe('Orders in the workshop', () => {
  it('counts the orders in the workshop and the ready ones', async () => {
    renderOrders()

    expect(await screen.findByText('2 en el taller · 1 listo para recoger')).toBeInTheDocument()
  })

  it('leaves out the ready count when no order is ready', async () => {
    renderOrders({ orders: [LUCIA_RECEIVED] })

    expect(await screen.findByText('1 en el taller')).toBeInTheDocument()
  })

  it('starts on the orders in the workshop', async () => {
    renderOrders()
    await ordersInWorkshop()

    const filter = screen.getByRole('group', { name: 'Qué pedidos ver' })
    expect(within(filter).getByRole('button', { name: 'En el taller' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(filter).getByRole('button', { name: 'Terminados' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('lists the active orders by delivery date, earliest first, without the date', async () => {
    renderOrders()

    const rows = rowsIn(await ordersInWorkshop())

    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Ticket 7720 · Carlos Ruiz')
    expect(rows[0]).toHaveTextContent('Cambio de cierre de chamarra')
    expect(rows[0]).toHaveTextContent('Listo para recoger')
    expect(rows[0]).not.toHaveTextContent('octubre')
    expect(rows[1]).toHaveTextContent('Ticket 5512 · Lucía Gómez')
    expect(rows[1]).toHaveTextContent('Recibido')
  })
})

describe('Order detail', () => {
  it('asks to choose an order before showing one', async () => {
    renderOrders()
    await ordersInWorkshop()

    expect(orderDetail()).toHaveTextContent('Elige un pedido para ver su detalle.')
  })

  it("shows the chosen order's ticket, client, work, status, delivery and total", async () => {
    renderOrders()

    const detail = await chooseOrder('Carlos Ruiz')

    expect(within(detail).getByText('Ticket 7720')).toBeInTheDocument()
    expect(within(detail).getByRole('heading', { name: 'Carlos Ruiz' })).toBeInTheDocument()
    expect(detail).toHaveTextContent('Cambio de cierre de chamarra')
    expect(detail).toHaveTextContent('Listo para recoger')
    expect(currentStep(detail)).toBe('Listo')
    expect(fact(detail, 'Entrega')).toBe('Domingo 25 de octubre')
    expect(fact(detail, 'Total, se paga en el taller')).toBe('$150 MXN')
    expect(rowOf('Carlos Ruiz')).toHaveAttribute('aria-current', 'true')
  })

  it('says "Hoy" for an order due today', async () => {
    renderOrders({ orders: [{ ...CARLOS_READY, deliveryDate: '2026-10-24' }] })

    const detail = await chooseOrder('Carlos Ruiz')

    expect(fact(detail, 'Entrega')).toBe('Hoy, sábado 24 de octubre')
  })

  it('closes the detail with "Volver a pedidos"', async () => {
    renderOrders()
    await chooseOrder('Carlos Ruiz')

    await userEvent.click(button('Volver a pedidos'))

    expect(orderDetail()).toHaveTextContent('Elige un pedido para ver su detalle.')
    expect(rowOf('Carlos Ruiz')).not.toHaveAttribute('aria-current')
  })
})

describe('Moving an order', () => {
  it('moves an order one step forward and back, in the detail and in its row', async () => {
    renderOrders()
    await chooseOrder('Lucía Gómez')

    await userEvent.click(button('Empezar a trabajar'))
    await waitFor(() => expect(currentStep(orderDetail())).toBe('En proceso'))
    expect(rowOf('Lucía Gómez')).toHaveTextContent('En proceso')

    await userEvent.click(button('Regresar a Recibido'))
    await waitFor(() => expect(currentStep(orderDetail())).toBe('Recibido'))
  })

  it('delivers an order once confirmed and says where it went', async () => {
    renderOrders()
    await chooseOrder('Carlos Ruiz')

    await userEvent.click(button('Marcar como entregado'))
    expect(screen.getByText('¿Entregar el pedido de Carlos Ruiz?')).toBeInTheDocument()
    await userEvent.click(button('Sí, entregar el pedido'))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Pedido de Carlos Ruiz entregado. Lo encuentras en Terminados.',
      ),
    )
    expect(await ordersInWorkshop()).not.toHaveTextContent('Carlos Ruiz')
  })

  it('keeps the order when the admin changes her mind about delivering it', async () => {
    renderOrders()
    await chooseOrder('Carlos Ruiz')

    await userEvent.click(button('Marcar como entregado'))
    await userEvent.click(button('No, todavía no'))

    expect(currentStep(orderDetail())).toBe('Listo')
  })

  it('cancels an order once confirmed and says where it went', async () => {
    renderOrders()
    await chooseOrder('Lucía Gómez')

    await userEvent.click(button('Cancelar pedido'))
    expect(screen.getByText('¿Cancelar el pedido de Lucía Gómez?')).toBeInTheDocument()
    await userEvent.click(button('Sí, cancelar el pedido'))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Pedido de Lucía Gómez cancelado. Lo encuentras en Terminados.',
      ),
    )
    expect(await ordersInWorkshop()).not.toHaveTextContent('Lucía Gómez')
  })
})

describe('Ready order by WhatsApp', () => {
  it('links a ready order with a number to a prefilled WhatsApp chat', async () => {
    renderOrders()
    await chooseOrder('Lucía Gómez')

    await userEvent.click(button('Empezar a trabajar'))
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como listo' }))

    const notice = await within(orderDetail()).findByRole('link', { name: 'Avisar por WhatsApp' })
    const message =
      'Hola Lucía Gómez, tu pedido con ticket 5512 ya está listo. Total: $900 MXN. Puedes pasar a recogerlo.'
    expect(notice).toHaveAttribute('href', `https://wa.me/529985551234?text=${encodeURIComponent(message)}`)
    expect(notice).toHaveAttribute('target', '_blank')
  })

  it('says a ready order without a number has no WhatsApp', async () => {
    renderOrders()

    const detail = await chooseOrder('Carlos Ruiz')

    expect(detail).toHaveTextContent('No dejó WhatsApp para avisarle.')
    expect(within(detail).queryByRole('link')).not.toBeInTheDocument()
  })

  it('offers no WhatsApp notice before the order is ready', async () => {
    renderOrders()

    const detail = await chooseOrder('Lucía Gómez')

    expect(within(detail).queryByRole('link', { name: 'Avisar por WhatsApp' })).not.toBeInTheDocument()
  })
})
