import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { button, chooseAppointment, MONDAY_MORNING, renderDayView, slotAt } from './calendar-test-kit'

const MARIA_REMINDER =
  'Hola María López, te recuerdo tu cita en Costurando a la medida el sábado 24 de octubre a las 10:30. Tu ticket es 4821.'

describe('WhatsApp reminder', () => {
  it('links an appointment with a number to a prefilled WhatsApp chat', async () => {
    await renderDayView()

    const detail = await chooseAppointment('María López')
    const reminder = within(detail).getByRole('link', {
      name: 'Recordar por WhatsApp',
    })

    expect(reminder).toHaveAttribute('href', `https://wa.me/529981234567?text=${encodeURIComponent(MARIA_REMINDER)}`)
    expect(reminder).toHaveAttribute('target', 'calm-whatsapp')
    expect(reminder).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('says an appointment without a number has no WhatsApp', async () => {
    await renderDayView({ now: MONDAY_MORNING })

    const detail = await chooseAppointment('Juan Pérez')

    expect(detail).toHaveTextContent('WhatsAppNo dejó número')
    expect(within(detail).queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('Cancel an appointment', () => {
  it('frees the slot once the admin confirms', async () => {
    await renderDayView()

    const detail = await chooseAppointment('María López')
    await userEvent.click(within(detail).getByRole('button', { name: 'Cancelar cita' }))
    expect(screen.getByText('¿Cancelar la cita de María López a las 10:30?')).toBeInTheDocument()
    await userEvent.click(button('Sí, cancelar la cita'))

    await waitFor(async () => expect(await slotAt('10:30')).toHaveTextContent('10:30Libre'))
  })

  it('keeps the appointment when the admin changes her mind', async () => {
    await renderDayView()

    const detail = await chooseAppointment('María López')
    await userEvent.click(within(detail).getByRole('button', { name: 'Cancelar cita' }))
    await userEvent.click(button('No, dejarla'))

    expect(await slotAt('10:30')).toHaveTextContent('María López')
    expect(screen.queryByText(/¿Cancelar la cita/)).not.toBeInTheDocument()
  })
})

describe('Appointments that already started', () => {
  it('offers no cancel, reminder or block on a past day', async () => {
    await renderDayView({ now: MONDAY_MORNING })

    await userEvent.click(button('Día anterior'))
    await userEvent.click(button('Día anterior'))

    const detail = await chooseAppointment('María López')
    expect(detail).toHaveTextContent('María López')
    expect(within(detail).queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument()
    expect(within(detail).queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bloquear este día' })).not.toBeInTheDocument()
  })

  it('offers no cancel or reminder on an appointment that started today', async () => {
    // Saturday 10:45 in Cancún, María came at 10:30.
    await renderDayView({ now: new Date('2026-10-24T15:45:00Z') })

    const detail = await chooseAppointment('María López')

    expect(within(detail).queryByRole('button', { name: 'Cancelar cita' })).not.toBeInTheDocument()
    expect(within(detail).queryByRole('link')).not.toBeInTheDocument()
  })
})
