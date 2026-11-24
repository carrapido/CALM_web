import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  button,
  CARLOS_CHIP,
  CARLOS_READY,
  chip,
  chipsIn,
  chooseChip,
  currentStep,
  fact,
  findDay,
  LUCIA_CHIP,
  LUCIA_RECEIVED,
  orderChips,
  orderDetail,
  renderAgendaCalendar,
  searchTicket,
  segment,
} from './calendar-test-kit'

const SUNDAY = 'Domingo 25 de octubre'
const WEDNESDAY = 'Miércoles 28 de octubre'
const NOTHING_CHOSEN = 'Elige una cita o un pedido del calendario para ver su detalle.'

describe('Orders in the workshop', () => {
  it('counts the orders in the workshop and the ready ones', async () => {
    renderAgendaCalendar()

    expect(await screen.findByText('2 en el taller · 1 listo para recoger')).toBeInTheDocument()
  })

  it('leaves out the ready count when no order is ready', async () => {
    renderAgendaCalendar({ orders: [LUCIA_RECEIVED] })

    expect(await screen.findByText('1 en el taller')).toBeInTheDocument()
  })

  it('starts on the orders in the workshop', async () => {
    renderAgendaCalendar()
    await findDay(SUNDAY)

    await userEvent.click(segment('Qué ver', 'Pedidos'))

    expect(segment('Qué pedidos ver', 'En el taller')).toHaveAttribute('aria-pressed', 'true')
    expect(segment('Qué pedidos ver', 'Terminados')).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows the active orders on their delivery day, earliest first', async () => {
    renderAgendaCalendar()
    await findDay(SUNDAY)

    await userEvent.click(segment('Qué ver', 'Pedidos'))

    expect(await orderChips()).toEqual([CARLOS_CHIP, LUCIA_CHIP])
    expect(chipsIn(await findDay(SUNDAY))).toEqual([CARLOS_CHIP])
    expect(chipsIn(await findDay(WEDNESDAY))).toEqual([LUCIA_CHIP])
  })
})

describe('Order detail', () => {
  it('asks to choose an order before showing one', async () => {
    renderAgendaCalendar()
    await findDay(SUNDAY)

    await searchTicket('3301')
    await screen.findByRole('list', { name: 'Resultados de la búsqueda' })

    expect(orderDetail()).toHaveTextContent('Elige un pedido para ver su detalle.')
  })

  it("shows the chosen order's ticket, client, work, status, delivery and total", async () => {
    renderAgendaCalendar()

    await chooseChip(SUNDAY, CARLOS_CHIP)

    const detail = orderDetail()
    expect(within(detail).getByText('Ticket 7720')).toBeInTheDocument()
    expect(within(detail).getByRole('heading', { name: 'Carlos Ruiz' })).toBeInTheDocument()
    expect(detail).toHaveTextContent('Cambio de cierre de chamarra')
    expect(detail).toHaveTextContent('Listo para recoger')
    expect(currentStep(detail)).toBe('Listo')
    expect(fact(detail, 'Entrega')).toBe('Domingo 25 de octubre')
    expect(fact(detail, 'Total, se paga en el taller')).toBe('$150 MXN')
    expect(chip(SUNDAY, CARLOS_CHIP)).toHaveAttribute('aria-current', 'true')
  })

  it('says "Hoy" for an order due today', async () => {
    renderAgendaCalendar({ orders: [{ ...CARLOS_READY, deliveryDate: '2026-10-24' }] })

    await chooseChip('Sábado 24 de octubre', CARLOS_CHIP)

    expect(fact(orderDetail(), 'Entrega')).toBe('Hoy, sábado 24 de octubre')
  })

  it('closes the detail with "Volver a la agenda"', async () => {
    renderAgendaCalendar()
    await chooseChip(SUNDAY, CARLOS_CHIP)

    await userEvent.click(button('Volver a la agenda'))

    expect(screen.getByText(NOTHING_CHOSEN)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Detalle del pedido' })).not.toBeInTheDocument()
    expect(chip(SUNDAY, CARLOS_CHIP)).not.toHaveAttribute('aria-current')
  })
})

describe('Moving an order', () => {
  it('moves an order one step forward and back, in the detail and in its chip', async () => {
    renderAgendaCalendar()
    await chooseChip(WEDNESDAY, LUCIA_CHIP)

    await userEvent.click(button('Empezar a trabajar'))
    await waitFor(() => expect(currentStep(orderDetail())).toBe('En proceso'))
    expect(chipsIn(await findDay(WEDNESDAY))).toEqual(['Entrega del pedido 5512, Lucía Gómez, En proceso'])

    await userEvent.click(button('Regresar a Recibido'))
    await waitFor(() => expect(currentStep(orderDetail())).toBe('Recibido'))
  })

  it('delivers an order once confirmed and says where it went', async () => {
    renderAgendaCalendar()
    await chooseChip(SUNDAY, CARLOS_CHIP)

    await userEvent.click(button('Marcar como entregado'))
    expect(screen.getByText('¿Entregar el pedido de Carlos Ruiz?')).toBeInTheDocument()
    await userEvent.click(button('Sí, entregar el pedido'))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Pedido de Carlos Ruiz entregado. Lo encuentras en Terminados.',
      ),
    )
    expect(await orderChips()).not.toContain(CARLOS_CHIP)
  })

  it('keeps the order when the admin changes her mind about delivering it', async () => {
    renderAgendaCalendar()
    await chooseChip(SUNDAY, CARLOS_CHIP)

    await userEvent.click(button('Marcar como entregado'))
    await userEvent.click(button('No, todavía no'))

    expect(currentStep(orderDetail())).toBe('Listo')
  })

  it('cancels an order once confirmed and says where it went', async () => {
    renderAgendaCalendar()
    await chooseChip(WEDNESDAY, LUCIA_CHIP)

    await userEvent.click(button('Cancelar pedido'))
    expect(screen.getByText('¿Cancelar el pedido de Lucía Gómez?')).toBeInTheDocument()
    await userEvent.click(button('Sí, cancelar el pedido'))

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        'Pedido de Lucía Gómez cancelado. Lo encuentras en Terminados.',
      ),
    )
    expect(await orderChips()).not.toContain(LUCIA_CHIP)
  })
})

describe('Ready order by WhatsApp', () => {
  it('links a ready order with a number to a prefilled WhatsApp chat', async () => {
    renderAgendaCalendar()
    await chooseChip(WEDNESDAY, LUCIA_CHIP)

    await userEvent.click(button('Empezar a trabajar'))
    await userEvent.click(await screen.findByRole('button', { name: 'Marcar como listo' }))

    const notice = await within(orderDetail()).findByRole('link', { name: 'Avisar por WhatsApp' })
    const message =
      'Hola Lucía Gómez, tu pedido con ticket 5512 ya está listo. Total: $900 MXN. Puedes pasar a recogerlo.'
    expect(notice).toHaveAttribute('href', `https://wa.me/529985551234?text=${encodeURIComponent(message)}`)
    expect(notice).toHaveAttribute('target', 'calm-whatsapp')
    expect(notice).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('says a ready order without a number has no WhatsApp', async () => {
    renderAgendaCalendar()

    await chooseChip(SUNDAY, CARLOS_CHIP)

    const detail = orderDetail()
    expect(detail).toHaveTextContent('No dejó WhatsApp para avisarle.')
    expect(within(detail).queryByRole('link')).not.toBeInTheDocument()
  })

  it('offers no WhatsApp notice before the order is ready', async () => {
    renderAgendaCalendar()

    await chooseChip(WEDNESDAY, LUCIA_CHIP)

    expect(within(orderDetail()).queryByRole('link', { name: 'Avisar por WhatsApp' })).not.toBeInTheDocument()
  })
})
