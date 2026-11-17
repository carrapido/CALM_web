import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  SATURDAY_MORNING,
  button,
  dayHeading,
  daySlots,
  renderAgenda,
  slotGroup,
} from './agenda-test-kit'

describe('Agenda day view', () => {
  it("opens on today's date", async () => {
    renderAgenda(SATURDAY_MORNING)

    expect(await dayHeading()).toHaveTextContent('Hoy, sábado 24 de octubre')
  })

  it('takes today from the Cancún calendar, not from UTC', async () => {
    // Already Sunday in UTC, still Saturday 22:00 in Cancún.
    renderAgenda(new Date('2026-10-25T03:00:00Z'))

    expect(await dayHeading()).toHaveTextContent('Hoy, sábado 24 de octubre')
  })

  it('lists every 30-minute slot of the business hours, booked or free', async () => {
    renderAgenda(SATURDAY_MORNING)

    const slots = within(await daySlots()).getAllByRole('listitem')

    expect(slots).toHaveLength(4)
    expect(slots[0]).toHaveTextContent('10:00Libre')
    expect(slots[2]).toHaveTextContent('11:00Libre')
    expect(slots[3]).toHaveTextContent('11:30Libre')
  })

  it('shows the time, client, ticket and preliminary quote of a booked slot', async () => {
    renderAgenda(SATURDAY_MORNING)

    const bookedSlot = within(await daySlots()).getAllByRole('listitem')[1]

    expect(bookedSlot).toHaveTextContent('10:30')
    expect(bookedSlot).toHaveTextContent('María López')
    expect(bookedSlot).toHaveTextContent('Ticket 4821')
    expect(bookedSlot).toHaveTextContent('Dobladillo de pantalón, Cambio de cierre')
    expect(bookedSlot).toHaveTextContent('$250 MXN')
    expect(bookedSlot).not.toHaveTextContent('Libre')
  })

  it('moves to the next and previous day', async () => {
    renderAgenda(SATURDAY_MORNING)
    await dayHeading()

    await userEvent.click(button('Día anterior'))
    expect(await dayHeading()).toHaveTextContent('Viernes 23 de octubre')

    await userEvent.click(button('Día siguiente'))
    await userEvent.click(button('Día siguiente'))
    await userEvent.click(button('Día siguiente'))
    expect(await dayHeading()).toHaveTextContent('Lunes 26 de octubre')
    expect(await within(await daySlots()).findByText('Juan Pérez')).toBeInTheDocument()
  })

  it('keeps "Hoy" off on today and uses it to come back from other days', async () => {
    renderAgenda(SATURDAY_MORNING)
    await dayHeading()

    expect(button('Hoy')).toBeDisabled()

    await userEvent.click(button('Día siguiente'))
    await userEvent.click(button('Día siguiente'))
    await userEvent.click(button('Hoy'))

    expect(await dayHeading()).toHaveTextContent('Hoy, sábado 24 de octubre')
  })

  it('says a closed weekday is closed and lists no slots', async () => {
    renderAgenda(SATURDAY_MORNING)
    await dayHeading()

    await userEvent.click(button('Día siguiente'))

    expect(await screen.findByText('Cerrado')).toBeInTheDocument()
    expect(within(await daySlots()).queryAllByRole('listitem')).toHaveLength(0)
  })
})

describe('Agenda slots grouped by now', () => {
  it('splits today into the slots that already started and the ones still to come', async () => {
    // Saturday 11:15 in Cancún.
    renderAgenda(new Date('2026-10-24T16:15:00Z'))

    const before = within(await slotGroup('Antes de ahora')).getAllByRole('listitem')
    const later = within(await slotGroup('Más tarde')).getAllByRole('listitem')

    expect(before).toHaveLength(3)
    expect(before[0]).toHaveTextContent('10:00Libre')
    expect(before[1]).toHaveTextContent('María López')
    expect(before[2]).toHaveTextContent('11:00Libre')
    expect(later).toHaveLength(1)
    expect(later[0]).toHaveTextContent('11:30Libre')
    expect(screen.getByText('Ahora · 11:15')).toBeInTheDocument()
  })

  it('puts every slot of a past day before now, with no line for now', async () => {
    renderAgenda(SATURDAY_MORNING)
    await dayHeading()

    await userEvent.click(button('Día anterior'))

    const before = within(await slotGroup('Antes de ahora')).getAllByRole('listitem')
    expect(before).toHaveLength(8)
    expect(before[0]).toHaveTextContent('10:00Libre')
    expect(screen.queryByRole('list', { name: 'Más tarde' })).not.toBeInTheDocument()
    expect(screen.queryByText(/^Ahora ·/)).not.toBeInTheDocument()
  })
})
