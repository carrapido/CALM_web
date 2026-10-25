import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { activeOrders, button, cardsIn, currentStep, orderCard, renderOrders } from './orders-test-kit'

describe('New order from an appointment', () => {
  it("lists today's and recent appointments that have no order yet", async () => {
    await openNewOrder()

    const appointments = within(appointmentsWithoutOrder()).getAllByRole('listitem')

    expect(appointments).toHaveLength(2)
    expect(appointments[0]).toHaveTextContent('Hoy · 10:30 · María López')
    expect(appointments[1]).toHaveTextContent('Viernes 23 de octubre · 11:00 · Juan Pérez')
    expect(button('Cliente sin cita')).toBeInTheDocument()
  })

  it("registers the order with the appointment's ticket and client", async () => {
    await openNewOrder()

    await userEvent.click(button(/María López/))
    expect(field('Nombre del cliente')).toHaveValue('María López')
    expect(field('WhatsApp (opcional)')).toHaveValue('9981234567')
    expect(field('Trabajo a realizar')).toHaveValue('Dobladillo de pantalón, Cambio de cierre')
    await fillPriceAndDelivery('280', '2026-10-27')
    await userEvent.click(button('Guardar pedido'))

    expect(await screen.findByText('Ticket 4821')).toBeInTheDocument()
    await userEvent.click(button('Ver pedidos'))
    const maria = await orderCard('María López')
    expect(maria).toHaveTextContent('Ticket 4821')
    expect(maria).toHaveTextContent('$280 MXN')
    expect(currentStep(maria)).toBe('Recibido')
  })

  it('takes the appointment off the list once it has an order', async () => {
    await openNewOrder()
    await userEvent.click(button(/María López/))
    await fillPriceAndDelivery('280', '2026-10-27')
    await userEvent.click(button('Guardar pedido'))
    await userEvent.click(await screen.findByRole('button', { name: 'Ver pedidos' }))
    await activeOrders()

    await userEvent.click(button('Nuevo pedido'))

    const appointments = within(await findAppointmentsWithoutOrder()).getAllByRole('listitem')
    expect(appointments).toHaveLength(1)
    expect(appointments[0]).toHaveTextContent('Juan Pérez')
  })
})

describe('New order for a walk-in client', () => {
  it('gives the order a new ticket that no active order uses', async () => {
    // 0.55125 would draw 5512, Lucía's active ticket, so the next draw is used.
    renderOrders({ randomValues: [0.55125, 0.12345] })
    await activeOrders()
    await userEvent.click(button('Nuevo pedido'))

    await userEvent.click(await screen.findByRole('button', { name: 'Cliente sin cita' }))
    await userEvent.type(field('Nombre del cliente'), 'Ana Martínez')
    await userEvent.type(field('Trabajo a realizar'), 'Ajuste de vestido')
    await fillPriceAndDelivery('300', '2026-10-30')
    await userEvent.click(button('Guardar pedido'))

    expect(await screen.findByText('Ticket 1234')).toBeInTheDocument()
    expect(screen.getByText('Anota este número en el recibo del cliente.')).toBeInTheDocument()
  })

  it('refuses an order with missing or wrong data and saves nothing', async () => {
    await openNewOrder()
    await userEvent.click(button('Cliente sin cita'))

    await userEvent.type(field('WhatsApp (opcional)'), '99812')
    await fillPriceAndDelivery('0', '2026-10-23')
    await userEvent.click(button('Guardar pedido'))

    expect(screen.getByText('Escribe el nombre del cliente')).toBeInTheDocument()
    expect(screen.getByText('El WhatsApp debe tener 10 números')).toBeInTheDocument()
    expect(screen.getByText('Escribe el trabajo a realizar')).toBeInTheDocument()
    expect(screen.getByText('Escribe un precio mayor a 0')).toBeInTheDocument()
    expect(screen.getByText('Elige una fecha de entrega de hoy en adelante')).toBeInTheDocument()

    await userEvent.click(button('Volver sin guardar'))
    expect(cardsIn(await activeOrders())).toHaveLength(2)
  })
})

async function openNewOrder() {
  renderOrders()
  await activeOrders()
  await userEvent.click(button('Nuevo pedido'))
  await findAppointmentsWithoutOrder()
}

function appointmentsWithoutOrder(): HTMLElement {
  return screen.getByRole('list', { name: 'Citas sin pedido' })
}

function findAppointmentsWithoutOrder(): Promise<HTMLElement> {
  return screen.findByRole('list', { name: 'Citas sin pedido' })
}

function field(label: string): HTMLElement {
  return screen.getByLabelText(label)
}

async function fillPriceAndDelivery(price: string, deliveryDate: string) {
  await userEvent.clear(field('Precio final (MXN)'))
  await userEvent.type(field('Precio final (MXN)'), price)
  await userEvent.type(field('Fecha de entrega'), deliveryDate)
}
