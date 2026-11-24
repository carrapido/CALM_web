import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  button,
  CARLOS_READY,
  chipsIn,
  chooseAppointment,
  chooseChip,
  dayHeading,
  findDay,
  LUCIA_CHIP,
  MARIA_CHIP,
  orderDetail,
  renderAgendaCalendar,
  renderDayView,
  searchTicket,
  segment,
} from './calendar-test-kit'

const WEDNESDAY = 'Miércoles 28 de octubre'

// Each action reached the way the admin reaches it on the routed Agenda page.
describe('Order actions from the calendar', () => {
  it('cancels an order from its chip after asking, and shows it under Pedidos > Terminados', async () => {
    renderAgendaCalendar()
    await chooseChip(WEDNESDAY, LUCIA_CHIP)

    await userEvent.click(button('Cancelar pedido'))
    await userEvent.click(button('No, seguir con el pedido'))
    expect(within(orderDetail()).getByRole('button', { name: 'Cancelar pedido' })).toBeInTheDocument()
    expect(chipsIn(await findDay(WEDNESDAY))).toEqual([LUCIA_CHIP])

    await userEvent.click(button('Cancelar pedido'))
    await userEvent.click(button('Sí, cancelar el pedido'))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Pedido de Lucía Gómez cancelado. Lo encuentras en Terminados.',
    )
    expect(chipsIn(await findDay(WEDNESDAY))).toEqual([])
    await userEvent.click(segment('Qué ver', 'Pedidos'))
    await userEvent.click(segment('Qué pedidos ver', 'Terminados'))
    expect(chipsIn(await findDay(WEDNESDAY))).toEqual(['Entrega del pedido 5512, Lucía Gómez, Cancelado'])
  })

  it('shows a finished order found by its ticket read only', async () => {
    renderAgendaCalendar()
    await findDay(WEDNESDAY)
    await searchTicket('6604')

    const results = await screen.findByRole('list', { name: 'Resultados de la búsqueda' })
    await userEvent.click(within(results).getByRole('button', { name: /Sofía Ramos/ }))

    const detail = orderDetail()
    expect(within(detail).getByRole('heading', { name: 'Sofía Ramos' })).toBeInTheDocument()
    expect(within(detail).getAllByRole('button').map((detailButton) => detailButton.textContent)).toEqual([
      expect.stringContaining('Volver a la agenda'),
    ])
    expect(within(detail).queryByRole('link')).not.toBeInTheDocument()
  })

  it('links "Avisar por WhatsApp" to wa.me on a ready order with a number', async () => {
    renderAgendaCalendar({ orders: [{ ...CARLOS_READY, whatsapp: '9987654321' }] })

    await chooseChip('Domingo 25 de octubre', 'Entrega del pedido 7720, Carlos Ruiz, Listo para recoger')

    const notice = within(orderDetail()).getByRole('link', { name: 'Avisar por WhatsApp' })
    const message =
      'Hola Carlos Ruiz, tu pedido con ticket 7720 ya está listo. Total: $150 MXN. Puedes pasar a recogerlo.'
    expect(notice).toHaveAttribute('href', `https://wa.me/529987654321?text=${encodeURIComponent(message)}`)
    expect(notice).toHaveAttribute('target', '_blank')
  })

  it('says when no order has the searched ticket, and "Cerrar búsqueda" brings the month back', async () => {
    renderAgendaCalendar()
    await findDay(WEDNESDAY)

    await searchTicket('9999')

    expect(await screen.findByText('No hay ningún pedido con el ticket 9999')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Calendario del mes' })).not.toBeInTheDocument()
    await userEvent.click(button('Cerrar búsqueda'))
    expect(chipsIn(await findDay(WEDNESDAY))).toEqual([LUCIA_CHIP])
    expect(screen.queryByText('No hay ningún pedido con el ticket 9999')).not.toBeInTheDocument()
  })
})

describe('Agenda actions from the calendar', () => {
  it('blocks a day from Día and shows it as Bloqueado in Mes', async () => {
    await renderDayView()
    await userEvent.click(button('Día siguiente'))
    await userEvent.click(button('Día siguiente'))
    await userEvent.click(button('Día siguiente'))
    expect(await dayHeading()).toHaveTextContent('Martes 27 de octubre')

    await userEvent.click(button('Bloquear este día'))
    await userEvent.click(button('Sí, bloquear el día'))
    await screen.findByRole('heading', { name: 'Día bloqueado' })
    await userEvent.click(segment('Vista', 'Mes'))

    expect(within(await findDay('Martes 27 de octubre')).getByText('Bloqueado')).toBeInTheDocument()
  })

  it('shows a weekday closed in Mi horario as Cerrado in Mes', async () => {
    renderAgendaCalendar()
    expect(within(await findDay('Martes 27 de octubre')).queryByText('Cerrado')).not.toBeInTheDocument()

    await userEvent.click(button('Mi horario'))
    const tuesday = await screen.findByRole('group', { name: 'Martes' })
    await userEvent.click(within(tuesday).getByRole('switch', { name: 'Abierto' }))
    await userEvent.click(button('Guardar horario'))

    expect(within(await findDay('Martes 27 de octubre')).getByText('Cerrado')).toBeInTheDocument()
    expect(within(await findDay('Martes 20 de octubre')).getByText('Cerrado')).toBeInTheDocument()
  })

  it('cancels an appointment from Día and takes it off the month', async () => {
    await renderDayView()

    const detail = await chooseAppointment('María López')
    await userEvent.click(within(detail).getByRole('button', { name: 'Cancelar cita' }))
    await userEvent.click(button('Sí, cancelar la cita'))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Detalle de la cita' })).not.toBeInTheDocument())

    await userEvent.click(segment('Vista', 'Mes'))
    expect(chipsIn(await findDay('Sábado 24 de octubre'))).toEqual([])
  })

  it('cancels an appointment from its chip on Citas and takes it off Citas pendientes', async () => {
    renderAgendaCalendar()
    await findDay('Sábado 24 de octubre')
    await userEvent.click(segment('Qué ver', 'Citas'))
    const pendingBefore = await screen.findByRole('list', { name: 'Citas pendientes' })
    expect(within(pendingBefore).getByText(/María López/)).toBeInTheDocument()

    await chooseChip('Sábado 24 de octubre', MARIA_CHIP)
    await userEvent.click(button('Cancelar cita'))
    await userEvent.click(button('Sí, cancelar la cita'))

    const pending = await screen.findByRole('list', { name: 'Citas pendientes' })
    await waitFor(() => expect(within(pending).queryByText(/María López/)).not.toBeInTheDocument())
    expect(within(pending).getAllByRole('listitem')).toHaveLength(2)
    expect(chipsIn(await findDay('Sábado 24 de octubre'))).toEqual([])
  })
})
