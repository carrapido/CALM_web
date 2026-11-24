import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  APPOINTMENTS_AWAITING_ORDERS,
  CARLOS_READY,
  findDay,
  orderChips,
  renderAgendaCalendar,
  segment,
} from './calendar-test-kit'

async function showPendingAppointments(): Promise<HTMLElement> {
  await findDay('Sábado 24 de octubre')
  await userEvent.click(segment('Qué ver', 'Citas'))
  return screen.findByRole('list', { name: 'Citas pendientes' })
}

function rowsOf(list: HTMLElement): string[] {
  return within(list)
    .getAllByRole('listitem')
    .map((item) => item.textContent ?? '')
}

describe('Pending appointments', () => {
  it('splits pending appointments from the orders whose clothes are in the workshop', async () => {
    renderAgendaCalendar({ appointments: APPOINTMENTS_AWAITING_ORDERS })
    await findDay('Sábado 24 de octubre')

    await userEvent.click(segment('Qué ver', 'Pedidos'))
    const filter = screen.getByRole('group', { name: 'Qué pedidos ver' })
    expect(within(filter).getAllByRole('button').map((option) => option.textContent)).toEqual([
      'En el taller',
      'Terminados',
    ])
    expect((await orderChips()).join()).not.toMatch(/Pedro Canul/)

    expect(rowsOf(await showPendingAppointments()).join()).toMatch(/Pedro Canul/)
  })

  it('lists future and recent appointments without an order, soonest first', async () => {
    renderAgendaCalendar({ appointments: APPOINTMENTS_AWAITING_ORDERS })

    const list = await showPendingAppointments()

    const rows = rowsOf(list)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toContain('Ticket 0937 · Juan Pérez')
    expect(rows[1]).toContain('Ticket 4821 · María López')
    expect(rows[2]).toContain('Ticket 1357 · Pedro Canul')
  })

  it('shows the day, time, services and quote of each appointment', async () => {
    renderAgendaCalendar({ appointments: APPOINTMENTS_AWAITING_ORDERS })

    const list = await showPendingAppointments()

    const [, today, future] = rowsOf(list)
    expect(today).toContain('Hoy, 10:30')
    expect(today).toContain('Dobladillo de pantalón, Cambio de cierre')
    expect(today).toContain('$250 MXN')
    expect(future).toContain('Lunes 26 de octubre, 10:00')
    expect(future).toContain('Ajuste de saco')
    expect(future).toContain('$300 MXN')
  })

  it('leaves out an appointment that already became an order', async () => {
    renderAgendaCalendar({
      appointments: APPOINTMENTS_AWAITING_ORDERS,
      orders: [
        CARLOS_READY,
        {
          ticket: '1357',
          clientName: 'Pedro Canul',
          work: 'Ajuste de saco',
          finalPriceMxn: 300,
          deliveryDate: '2026-10-30',
          status: 'received',
          appointment: { date: '2026-10-26', time: '10:00' },
        },
      ],
    })

    const list = await showPendingAppointments()

    expect(within(list).queryByText(/Ticket 1357/)).not.toBeInTheDocument()
  })

  it('says when there are no pending appointments', async () => {
    renderAgendaCalendar({ appointments: [] })
    await findDay('Sábado 24 de octubre')

    await userEvent.click(segment('Qué ver', 'Citas'))

    expect(await screen.findByText('No hay citas pendientes.')).toBeInTheDocument()
  })
})
