import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { activeOrders, button, cardsIn, currentStep, orderCard, renderOrders } from './orders-test-kit'

describe('Active orders', () => {
  it('lists the active orders by delivery date, earliest first', async () => {
    renderOrders()

    const cards = cardsIn(await activeOrders())

    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveTextContent('Carlos Ruiz')
    expect(cards[1]).toHaveTextContent('Lucía Gómez')
  })

  it('shows the ticket, work, price, delivery date and current status of an order', async () => {
    renderOrders()

    const carlos = await orderCard('Carlos Ruiz')

    expect(carlos).toHaveTextContent('Ticket 7720')
    expect(carlos).toHaveTextContent('Cambio de cierre de chamarra')
    expect(carlos).toHaveTextContent('$150 MXN')
    expect(carlos).toHaveTextContent('Entrega: domingo 25 de octubre')
    expect(currentStep(carlos)).toBe('Listo')
  })

  it('moves an order one step forward and back', async () => {
    renderOrders()

    await userEvent.click(within(await orderCard('Lucía Gómez')).getByRole('button', { name: 'Empezar a trabajar' }))
    await waitFor(async () => expect(currentStep(await orderCard('Lucía Gómez'))).toBe('En proceso'))

    await userEvent.click(within(await orderCard('Lucía Gómez')).getByRole('button', { name: 'Regresar a Recibido' }))
    await waitFor(async () => expect(currentStep(await orderCard('Lucía Gómez'))).toBe('Recibido'))
  })

  it('delivers an order once confirmed and takes it off the active list', async () => {
    renderOrders()

    await userEvent.click(within(await orderCard('Carlos Ruiz')).getByRole('button', { name: 'Marcar como entregado' }))
    expect(screen.getByText('¿Entregar el pedido de Carlos Ruiz?')).toBeInTheDocument()
    await userEvent.click(button('Sí, entregar el pedido'))

    await waitFor(async () => expect(await activeOrders()).not.toHaveTextContent('Carlos Ruiz'))
  })

  it('keeps an order when the admin changes her mind about delivering it', async () => {
    renderOrders()

    await userEvent.click(within(await orderCard('Carlos Ruiz')).getByRole('button', { name: 'Marcar como entregado' }))
    await userEvent.click(button('No, todavía no'))

    expect(currentStep(await orderCard('Carlos Ruiz'))).toBe('Listo')
  })

  it('cancels an order once confirmed', async () => {
    renderOrders()

    await userEvent.click(within(await orderCard('Lucía Gómez')).getByRole('button', { name: 'Cancelar pedido' }))
    expect(screen.getByText('¿Cancelar el pedido de Lucía Gómez?')).toBeInTheDocument()
    await userEvent.click(button('Sí, cancelar el pedido'))

    await waitFor(async () => expect(await activeOrders()).not.toHaveTextContent('Lucía Gómez'))
  })
})

describe('Ready order by WhatsApp', () => {
  it('links a ready order with a number to a prefilled WhatsApp chat', async () => {
    renderOrders()
    const lucia = () => orderCard('Lucía Gómez')

    await userEvent.click(within(await lucia()).getByRole('button', { name: 'Empezar a trabajar' }))
    await userEvent.click(await within(await lucia()).findByRole('button', { name: 'Marcar como listo' }))

    const notice = await within(await lucia()).findByRole('link', { name: 'Avisar por WhatsApp' })
    const message =
      'Hola Lucía Gómez, tu pedido con ticket 5512 ya está listo. Total: $900 MXN. Puedes pasar a recogerlo.'
    expect(notice).toHaveAttribute('href', `https://wa.me/529985551234?text=${encodeURIComponent(message)}`)
    expect(notice).toHaveAttribute('target', '_blank')
  })

  it('says a ready order without a number has no WhatsApp', async () => {
    renderOrders()

    const carlos = await orderCard('Carlos Ruiz')

    expect(carlos).toHaveTextContent('Sin WhatsApp')
    expect(within(carlos).queryByRole('link')).not.toBeInTheDocument()
  })

  it('offers no WhatsApp notice before the order is ready', async () => {
    renderOrders()

    const lucia = await orderCard('Lucía Gómez')

    expect(within(lucia).queryByRole('link', { name: 'Avisar por WhatsApp' })).not.toBeInTheDocument()
  })
})
