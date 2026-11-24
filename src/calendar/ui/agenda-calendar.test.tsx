import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  button,
  CARLOS_CHIP,
  chipsIn,
  findDay,
  LUCIA_CHIP,
  MARIA_CHIP,
  renderAgendaCalendar,
  segment,
} from './calendar-test-kit'

async function openMonth() {
  renderAgendaCalendar()
  return findDay('Sábado 24 de octubre')
}

describe('Month calendar', () => {
  it('opens on the month of today with Mes chosen', async () => {
    await openMonth()

    expect(screen.getByRole('heading', { level: 1, name: 'Agenda' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Octubre 2026' })).toBeInTheDocument()
    expect(segment('Vista', 'Mes')).toHaveAttribute('aria-pressed', 'true')
    expect(segment('Qué ver', 'Todo')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('2 en el taller · 1 listo para recoger')).toBeInTheDocument()
  })

  it('places appointments on their day and orders on their delivery day', async () => {
    const saturday = await openMonth()

    expect(chipsIn(saturday)).toEqual([MARIA_CHIP])
    expect(chipsIn(await findDay('Domingo 25 de octubre'))).toEqual([CARLOS_CHIP])
    expect(chipsIn(await findDay('Miércoles 28 de octubre'))).toEqual([LUCIA_CHIP])
    expect(chipsIn(await findDay('Lunes 26 de octubre'))).toEqual(['Cita por recibir, 10:00, Juan Pérez, ticket 0937'])
  })

  it('marks today, closed days and blocked days in words', async () => {
    const saturday = await openMonth()

    expect(within(saturday).getByRole('button', { name: 'Abrir el sábado 24 de octubre, hoy' })).toBeInTheDocument()
    expect(within(await findDay('Domingo 25 de octubre')).getByText('Cerrado')).toBeInTheDocument()
    expect(within(await findDay('Lunes 12 de octubre')).getByText('Bloqueado')).toBeInTheDocument()
  })

  it('moves between months and back to this one with Hoy', async () => {
    await openMonth()
    expect(button('Hoy')).toBeDisabled()

    await userEvent.click(button(/Mes siguiente/))
    expect(await screen.findByRole('heading', { level: 2, name: 'Noviembre 2026' })).toBeInTheDocument()
    expect(button('Hoy')).toBeEnabled()

    await userEvent.click(button('Hoy'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Octubre 2026' })).toBeInTheDocument()

    await userEvent.click(button(/Mes anterior/))
    expect(await screen.findByRole('heading', { level: 2, name: 'Septiembre 2026' })).toBeInTheDocument()
  })
})

describe('What to see', () => {
  it('shows only appointments on Citas', async () => {
    await openMonth()

    await userEvent.click(segment('Qué ver', 'Citas'))

    expect(chipsIn(await findDay('Sábado 24 de octubre'))).toEqual([MARIA_CHIP])
    expect(chipsIn(await findDay('Miércoles 28 de octubre'))).toEqual([])
    expect(screen.queryByRole('group', { name: 'Qué pedidos ver' })).not.toBeInTheDocument()
  })

  it('shows the orders in the workshop on Pedidos, and the finished ones on Terminados', async () => {
    await openMonth()

    await userEvent.click(segment('Qué ver', 'Pedidos'))
    expect(segment('Qué pedidos ver', 'En el taller')).toHaveAttribute('aria-pressed', 'true')
    expect(chipsIn(await findDay('Sábado 24 de octubre'))).toEqual([])
    expect(chipsIn(await findDay('Miércoles 28 de octubre'))).toEqual([LUCIA_CHIP])

    await userEvent.click(segment('Qué pedidos ver', 'Terminados'))
    expect(chipsIn(await findDay('Martes 20 de octubre'))).toEqual(['Entrega del pedido 3301, Elena Díaz, Entregado'])
    expect(chipsIn(await findDay('Lunes 19 de octubre'))).toEqual(['Entrega del pedido 6604, Sofía Ramos, Cancelado'])
    expect(chipsIn(await findDay('Miércoles 28 de octubre'))).toEqual([])
  })

  it('lists on Citas the pending appointments, from this month and later ones, soonest first', async () => {
    await openMonth()
    expect(screen.queryByRole('list', { name: 'Citas pendientes' })).not.toBeInTheDocument()

    await userEvent.click(segment('Qué ver', 'Citas'))

    const pending = await screen.findByRole('list', { name: 'Citas pendientes' })
    expect(within(pending).getAllByRole('listitem').map((row) => row.textContent)).toEqual([
      'Ticket 4821 · María LópezDobladillo de pantalón, Cambio de cierreHoy, 10:30$250 MXN',
      'Ticket 0937 · Juan PérezAjuste de cinturaLunes 26 de octubre, 10:00$180 MXN',
      'Ticket 5150 · Ana MartínezAjuste de vestidoMiércoles 18 de noviembre, 11:00$450 MXN',
    ])
    expect(screen.queryByText(/Elige una cita o un pedido/)).not.toBeInTheDocument()
  })

  it('hides finished orders on Todo', async () => {
    await openMonth()

    expect(chipsIn(await findDay('Martes 20 de octubre'))).toEqual([])
    expect(screen.queryByRole('group', { name: 'Qué pedidos ver' })).not.toBeInTheDocument()
  })
})

describe('Chip detail', () => {
  it('opens the appointment detail with its reminder and cancels it after asking', async () => {
    const saturday = await openMonth()

    await userEvent.click(within(saturday).getByRole('button', { name: MARIA_CHIP }))

    expect(within(saturday).getByRole('button', { name: MARIA_CHIP })).toHaveAttribute('aria-current', 'true')
    const detail = screen.getByRole('region', { name: 'Detalle de la cita' })
    expect(within(detail).getByRole('heading', { name: 'María López' })).toBeInTheDocument()
    expect(within(detail).getByRole('link', { name: 'Recordar por WhatsApp' })).toBeInTheDocument()

    await userEvent.click(within(detail).getByRole('button', { name: 'Cancelar cita' }))
    await userEvent.click(button('Sí, cancelar la cita'))

    expect(chipsIn(await findDay('Sábado 24 de octubre'))).toEqual([])
    expect(screen.queryByRole('region', { name: 'Detalle de la cita' })).not.toBeInTheDocument()
  })

  it('opens the order detail and moves the order forward', async () => {
    await openMonth()
    const wednesday = await findDay('Miércoles 28 de octubre')

    await userEvent.click(within(wednesday).getByRole('button', { name: LUCIA_CHIP }))
    const detail = screen.getByRole('region', { name: 'Detalle del pedido' })
    expect(within(detail).getByRole('heading', { name: 'Lucía Gómez' })).toBeInTheDocument()

    await userEvent.click(within(detail).getByRole('button', { name: 'Empezar a trabajar' }))

    expect(await within(detail).findByText('En proceso', { selector: 'p' })).toBeInTheDocument()
    expect(within(detail).getByRole('button', { name: 'Regresar a Recibido' })).toBeInTheDocument()
  })

  it('delivers a ready order after asking and says where it went', async () => {
    await openMonth()
    const sunday = await findDay('Domingo 25 de octubre')

    await userEvent.click(within(sunday).getByRole('button', { name: CARLOS_CHIP }))
    expect(screen.getByText('No dejó WhatsApp para avisarle.')).toBeInTheDocument()
    await userEvent.click(button('Marcar como entregado'))
    await userEvent.click(button('Sí, entregar el pedido'))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Pedido de Carlos Ruiz entregado. Lo encuentras en Terminados.',
    )
    expect(chipsIn(await findDay('Domingo 25 de octubre'))).toEqual([])
    expect(screen.queryByRole('region', { name: 'Detalle del pedido' })).not.toBeInTheDocument()
  })
})

describe('Views', () => {
  it('opens the day view when a day of the month is tapped', async () => {
    await openMonth()

    await userEvent.click(button('Abrir el lunes 26 de octubre'))

    expect(await screen.findByRole('heading', { level: 2, name: 'Lunes 26 de octubre' })).toBeInTheDocument()
    expect(segment('Vista', 'Día')).toHaveAttribute('aria-pressed', 'true')
    expect(await screen.findByRole('button', { name: /Juan Pérez/ })).toBeInTheDocument()
    expect(button('Bloquear este día')).toBeInTheDocument()
  })

  it('shows the week and opens a day from it', async () => {
    await openMonth()

    await userEvent.click(segment('Vista', 'Semana'))
    const week = await screen.findByRole('list', { name: 'Días de la semana' })
    await userEvent.click(within(week).getByRole('button', { name: /Lunes 19 de octubre/ }))

    expect(await screen.findByRole('heading', { level: 2, name: 'Lunes 19 de octubre' })).toBeInTheDocument()
  })
})

describe('Page actions', () => {
  it('registers a new order and shows it on the calendar', async () => {
    await openMonth()

    await userEvent.click(button('Nuevo pedido'))
    await screen.findByRole('group', { name: '¿De qué cita viene?' })
    await userEvent.clear(screen.getByLabelText('Precio final'))
    await userEvent.type(screen.getByLabelText('Precio final'), '280')
    await userEvent.type(screen.getByLabelText('Fecha de entrega'), '2026-10-27')
    await userEvent.click(button('Registrar pedido'))
    expect(await screen.findByRole('heading', { name: 'Pedido registrado' })).toBeInTheDocument()
    await userEvent.click(button('Volver a la agenda'))

    expect(chipsIn(await findDay('Martes 27 de octubre'))).toEqual(['Entrega del pedido 4821, María López, Recibido'])
  })

  it('shows an appointment that became an order only as its order, on Todo and on Citas', async () => {
    await openMonth()

    await userEvent.click(button('Nuevo pedido'))
    await screen.findByRole('group', { name: '¿De qué cita viene?' })
    await userEvent.clear(screen.getByLabelText('Precio final'))
    await userEvent.type(screen.getByLabelText('Precio final'), '280')
    await userEvent.type(screen.getByLabelText('Fecha de entrega'), '2026-10-27')
    await userEvent.click(button('Registrar pedido'))
    await userEvent.click(await screen.findByRole('button', { name: 'Volver a la agenda' }))

    expect(chipsIn(await findDay('Sábado 24 de octubre'))).toEqual([])
    expect(chipsIn(await findDay('Martes 27 de octubre'))).toEqual(['Entrega del pedido 4821, María López, Recibido'])
    expect(chipsIn(await findDay('Lunes 26 de octubre'))).toEqual(['Cita por recibir, 10:00, Juan Pérez, ticket 0937'])
    expect(chipsIn(await findDay('Miércoles 28 de octubre'))).toEqual([LUCIA_CHIP])

    await userEvent.click(segment('Qué ver', 'Citas'))
    const pending = await screen.findByRole('list', { name: 'Citas pendientes' })
    expect(chipsIn(await findDay('Sábado 24 de octubre'))).toEqual([])
    expect(within(pending).queryByText(/María López/)).not.toBeInTheDocument()
  })

  it('opens Mi horario and comes back to the calendar', async () => {
    await openMonth()

    await userEvent.click(button('Mi horario'))
    expect(await screen.findByRole('heading', { level: 2, name: 'Mi horario' })).toBeInTheDocument()
    await userEvent.click(button('Volver sin guardar'))

    expect(await findDay('Sábado 24 de octubre')).toBeInTheDocument()
  })

  it('finds an order by ticket, opens it, and closes the search', async () => {
    await openMonth()

    await userEvent.type(screen.getByRole('textbox', { name: 'Buscar por ticket' }), '3301')
    await userEvent.click(button('Buscar'))
    const results = await screen.findByRole('list', { name: 'Resultados de la búsqueda' })
    await userEvent.click(within(results).getByRole('button', { name: /Elena Díaz/ }))
    expect(
      within(screen.getByRole('region', { name: 'Detalle del pedido' })).getByRole('heading', { name: 'Elena Díaz' }),
    ).toBeInTheDocument()

    await userEvent.click(button('Cerrar búsqueda'))
    expect(await findDay('Sábado 24 de octubre')).toBeInTheDocument()
  })
})
