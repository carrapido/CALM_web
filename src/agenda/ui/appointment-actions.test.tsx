import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  MONDAY_MORNING,
  SATURDAY_MORNING,
  button,
  dayHeading,
  renderAgenda,
  slotAt,
} from './agenda-test-kit'

const MARIA_REMINDER =
  'Hola María López, te recuerdo tu cita en Costurando a la medida el sábado 24 de octubre a las 10:30. Tu ticket es 4821.'

describe('WhatsApp reminder', () => {
  it('links an appointment with a number to a prefilled WhatsApp chat', async () => {
    renderAgenda(SATURDAY_MORNING)

    const reminder = within(await slotAt('10:30')).getByRole('link', {
      name: 'Recordar por WhatsApp',
    })

    expect(reminder).toHaveAttribute(
      'href',
      `https://wa.me/529981234567?text=${encodeURIComponent(MARIA_REMINDER)}`,
    )
    expect(reminder).toHaveAttribute('target', '_blank')
  })

  it('says an appointment without a number has no WhatsApp', async () => {
    renderAgenda(MONDAY_MORNING)

    const juanSlot = await slotAt('10:00')

    expect(juanSlot).toHaveTextContent('Sin WhatsApp')
    expect(within(juanSlot).queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('Cancel an appointment', () => {
  it('frees the slot once the admin confirms', async () => {
    renderAgenda(SATURDAY_MORNING)

    await userEvent.click(within(await slotAt('10:30')).getByRole('button', { name: 'Cancelar cita' }))
    expect(screen.getByText('¿Cancelar la cita de María López a las 10:30?')).toBeInTheDocument()
    await userEvent.click(button('Sí, cancelar la cita'))

    await waitFor(async () => expect(await slotAt('10:30')).toHaveTextContent('10:30Libre'))
  })

  it('keeps the appointment when the admin changes her mind', async () => {
    renderAgenda(SATURDAY_MORNING)

    await userEvent.click(within(await slotAt('10:30')).getByRole('button', { name: 'Cancelar cita' }))
    await userEvent.click(button('No, dejarla'))

    expect(await slotAt('10:30')).toHaveTextContent('María López')
    expect(screen.queryByText(/¿Cancelar la cita/)).not.toBeInTheDocument()
  })
})

describe('Appointments that already started', () => {
  it('offers no cancel, reminder or block on a past day', async () => {
    renderAgenda(MONDAY_MORNING)
    await dayHeading()

    await userEvent.click(button('Día anterior'))
    await userEvent.click(button('Día anterior'))

    const mariaSlot = await slotAt('10:30')
    expect(mariaSlot).toHaveTextContent('María López')
    expect(within(mariaSlot).queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument()
    expect(within(mariaSlot).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bloquear este día' })).not.toBeInTheDocument()
  })

  it('offers no cancel or reminder on an appointment that started today', async () => {
    // Saturday 10:45 in Cancún, María came at 10:30.
    renderAgenda(new Date('2026-10-24T15:45:00Z'))

    const mariaSlot = await slotAt('10:30')

    expect(within(mariaSlot).queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument()
    expect(within(mariaSlot).queryByRole('link')).not.toBeInTheDocument()
  })
})
