import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  button,
  CARLOS_CHIP,
  chooseChip,
  currentStep,
  findDay,
  LUCIA_CHIP,
  orderChips,
  orderDetail,
  renderAgendaCalendar,
  searchTicket,
  segment,
} from './calendar-test-kit'

const ELENA_CHIP = 'Entrega del pedido 3301, Elena Díaz, Entregado'
const SOFIA_CHIP = 'Entrega del pedido 6604, Sofía Ramos, Cancelado'

describe('Find an order by ticket', () => {
  it('shows a finished order found by its ticket and opens its detail', async () => {
    await openCalendar()

    await searchTicket('3301')

    const results = await screen.findByRole('list', { name: 'Resultados de la búsqueda' })
    expect(results).toHaveTextContent('Elena Díaz')
    expect(results).toHaveTextContent('Entregado')
    await userEvent.click(within(results).getByRole('button', { name: /Elena Díaz/ }))
    expect(within(orderDetail()).getByRole('heading', { name: 'Elena Díaz' })).toBeInTheDocument()
  })

  it('says when no order has that ticket', async () => {
    await openCalendar()

    await searchTicket('9999')

    expect(await screen.findByText('No hay ningún pedido con el ticket 9999')).toBeInTheDocument()
  })

  it('asks for the 4 digits of the ticket', async () => {
    await openCalendar()

    await searchTicket('33')

    expect(await screen.findByText('Escribe los 4 números del ticket')).toBeInTheDocument()
  })

  it('brings the calendar back when the search is closed', async () => {
    await openCalendar()
    await searchTicket('3301')
    await screen.findByRole('list', { name: 'Resultados de la búsqueda' })

    await userEvent.click(button('Cerrar búsqueda'))

    expect(await orderChips()).toEqual([CARLOS_CHIP, LUCIA_CHIP])
    expect(screen.queryByRole('list', { name: 'Resultados de la búsqueda' })).not.toBeInTheDocument()
  })
})

describe('Finished orders', () => {
  it('shows delivered and cancelled orders on Terminados', async () => {
    await openCalendar()
    await userEvent.click(segment('Qué ver', 'Pedidos'))

    await userEvent.click(segment('Qué pedidos ver', 'Terminados'))

    expect(await orderChips()).toEqual([SOFIA_CHIP, ELENA_CHIP])
    expect(segment('Qué pedidos ver', 'Terminados')).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows a finished order read only', async () => {
    await openCalendar()
    await userEvent.click(segment('Qué ver', 'Pedidos'))
    await userEvent.click(segment('Qué pedidos ver', 'Terminados'))

    await chooseChip('Martes 20 de octubre', ELENA_CHIP)

    const detail = orderDetail()
    expect(currentStep(detail)).toBe('Entregado')
    const buttonNames = within(detail)
      .getAllByRole('button')
      .map((detailButton) => detailButton.textContent)
    expect(buttonNames).toHaveLength(1)
    expect(buttonNames[0]).toContain('Volver a la agenda')
  })
})

async function openCalendar() {
  renderAgendaCalendar()
  await findDay('Sábado 24 de octubre')
}
