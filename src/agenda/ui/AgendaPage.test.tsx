import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SATURDAY_MORNING, button, dayHeading, daySlots, renderAgenda } from './agenda-test-kit'

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

  it('offers a way back to today only on other days', async () => {
    renderAgenda(SATURDAY_MORNING)
    await dayHeading()

    expect(screen.queryByRole('button', { name: 'Volver a hoy' })).not.toBeInTheDocument()

    await userEvent.click(button('Día siguiente'))
    await userEvent.click(button('Día siguiente'))
    await userEvent.click(button('Volver a hoy'))

    expect(await dayHeading()).toHaveTextContent('Hoy, sábado 24 de octubre')
  })

  it('says a closed weekday is closed and lists no slots', async () => {
    renderAgenda(SATURDAY_MORNING)
    await dayHeading()

    await userEvent.click(button('Día siguiente'))

    expect(await screen.findByText('Cerrado')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Horarios del día' })).not.toBeInTheDocument()
  })
})

describe('Agenda past slots', () => {
  it('shows free slots that already started today as past', async () => {
    // Saturday 11:15 in Cancún.
    renderAgenda(new Date('2026-10-24T16:15:00Z'))

    const slots = within(await daySlots()).getAllByRole('listitem')

    expect(slots[0]).toHaveTextContent('10:00Pasado')
    expect(slots[1]).toHaveTextContent('María López')
    expect(slots[2]).toHaveTextContent('11:00Pasado')
    expect(slots[3]).toHaveTextContent('11:30Libre')
  })

  it('shows every free slot of a past day as past', async () => {
    renderAgenda(SATURDAY_MORNING)
    await dayHeading()

    await userEvent.click(button('Día anterior'))

    const slots = within(await daySlots()).getAllByRole('listitem')
    slots.forEach((slot) => expect(slot).toHaveTextContent('Pasado'))
  })
})
