import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  button,
  chooseOrder,
  currentStep,
  fact,
  ordersInWorkshop,
  renderOrders,
  rowsIn,
} from './orders-test-kit'

describe('New order sheet', () => {
  it("offers today's and recent appointments without an order, and walk-in clients", async () => {
    await openNewOrder()

    const choices = within(origin()).getAllByRole('radio')

    expect(choices).toHaveLength(3)
    expect(choices[0]).toHaveAccessibleName('María López')
    expect(choices[0]).toHaveAccessibleDescription('Hoy a las 10:30 · Ticket 4821')
    expect(choices[1]).toHaveAccessibleName('Juan Pérez')
    expect(choices[1]).toHaveAccessibleDescription('Viernes 23 de octubre a las 11:00 · Ticket 0937')
    expect(choices[2]).toHaveAccessibleName('Llegó sin cita')
  })

  it('starts on the first appointment with its client prefilled', async () => {
    await openNewOrder()

    expect(screen.getByRole('radio', { name: 'María López' })).toBeChecked()
    expect(field('Nombre del cliente')).toHaveValue('María López')
    expect(field('WhatsApp (opcional)')).toHaveValue('9981234567')
    expect(field('Trabajo a realizar')).toHaveValue('Dobladillo de pantalón, Cambio de cierre')
    expect(field('Precio final')).toHaveValue('250')
    expect(screen.getByText('Conserva el ticket 4821 de su cita.')).toBeInTheDocument()
  })

  it('fills the fields from another appointment', async () => {
    await openNewOrder()

    await userEvent.click(screen.getByRole('radio', { name: 'Juan Pérez' }))

    expect(field('Nombre del cliente')).toHaveValue('Juan Pérez')
    expect(field('WhatsApp (opcional)')).toHaveValue('')
    expect(field('Trabajo a realizar')).toHaveValue('Ajuste de cintura')
    expect(field('Precio final')).toHaveValue('180')
    expect(screen.getByText('Conserva el ticket 0937 de su cita.')).toBeInTheDocument()
  })

  it('empties the fields for a client who came without an appointment', async () => {
    await openNewOrder()

    await userEvent.click(screen.getByRole('radio', { name: 'Llegó sin cita' }))

    expect(field('Nombre del cliente')).toHaveValue('')
    expect(field('Trabajo a realizar')).toHaveValue('')
    expect(field('Precio final')).toHaveValue('')
    expect(screen.getByText('Se crea un ticket nuevo de 4 números.')).toBeInTheDocument()
  })
})

describe('Registering an order', () => {
  it("registers the order with the appointment's ticket", async () => {
    await openNewOrder()

    await fillPriceAndDelivery('280', '2026-10-27')
    await userEvent.click(button('Registrar pedido'))

    expect(await screen.findByRole('heading', { name: 'Pedido registrado' })).toBeInTheDocument()
    expect(screen.getByText('Ticket 4821')).toBeInTheDocument()
    await userEvent.click(button('Ver pedidos'))
    const detail = await chooseOrder('María López')
    expect(within(detail).getByText('Ticket 4821')).toBeInTheDocument()
    expect(fact(detail, 'Total, se paga en el taller')).toBe('$280 MXN')
    expect(currentStep(detail)).toBe('Recibido')
  })

  it('takes the appointment off the choices once it has an order', async () => {
    await openNewOrder()
    await fillPriceAndDelivery('280', '2026-10-27')
    await userEvent.click(button('Registrar pedido'))
    await userEvent.click(await screen.findByRole('button', { name: 'Ver pedidos' }))
    await ordersInWorkshop()

    await userEvent.click(button('Nuevo pedido'))

    const choices = within(await findOrigin()).getAllByRole('radio')
    expect(choices).toHaveLength(2)
    expect(choices[0]).toHaveAccessibleName('Juan Pérez')
  })

  it('gives a walk-in order a new ticket that no active order uses', async () => {
    // 0.55125 would draw 5512, Lucía's active ticket, so the next draw is used.
    renderOrders({ randomValues: [0.55125, 0.12345] })
    await ordersInWorkshop()
    await userEvent.click(button('Nuevo pedido'))
    await userEvent.click(within(await findOrigin()).getByRole('radio', { name: 'Llegó sin cita' }))

    await userEvent.type(field('Nombre del cliente'), 'Ana Martínez')
    await userEvent.type(field('Trabajo a realizar'), 'Ajuste de vestido')
    await fillPriceAndDelivery('300', '2026-10-30')
    await userEvent.click(button('Registrar pedido'))

    expect(await screen.findByText('Ticket 1234')).toBeInTheDocument()
    expect(screen.getByText('Anota este número en el recibo del cliente.')).toBeInTheDocument()
  })

  it('refuses an order with missing or wrong data and saves nothing', async () => {
    await openNewOrder()
    await userEvent.click(screen.getByRole('radio', { name: 'Llegó sin cita' }))

    await userEvent.type(field('WhatsApp (opcional)'), '99812')
    await fillPriceAndDelivery('0', '2026-10-23')
    await userEvent.click(button('Registrar pedido'))

    expect(screen.getByText('Escribe el nombre del cliente')).toBeInTheDocument()
    expect(screen.getByText('El WhatsApp debe tener 10 números')).toBeInTheDocument()
    expect(screen.getByText('Escribe el trabajo a realizar')).toBeInTheDocument()
    expect(screen.getByText('Escribe un precio mayor a 0')).toBeInTheDocument()
    expect(screen.getByText('Elige una fecha de entrega de hoy en adelante')).toBeInTheDocument()

    await userEvent.click(button('Volver sin guardar'))
    expect(rowsIn(await ordersInWorkshop())).toHaveLength(2)
  })
})

async function openNewOrder() {
  renderOrders()
  await ordersInWorkshop()
  await userEvent.click(button('Nuevo pedido'))
  await findOrigin()
}

function origin(): HTMLElement {
  return screen.getByRole('group', { name: '¿De qué cita viene?' })
}

function findOrigin(): Promise<HTMLElement> {
  return screen.findByRole('group', { name: '¿De qué cita viene?' })
}

function field(label: string): HTMLElement {
  return screen.getByLabelText(label)
}

async function fillPriceAndDelivery(price: string, deliveryDate: string) {
  await userEvent.clear(field('Precio final'))
  await userEvent.type(field('Precio final'), price)
  await userEvent.type(field('Fecha de entrega'), deliveryDate)
}
