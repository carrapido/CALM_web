import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import {
  SATURDAY_MORNING,
  appointmentDetail,
  appointmentRow,
  button,
  chooseAppointment,
  dayHeading,
  renderAgenda,
  slotGroup,
} from './agenda-test-kit'

describe('Appointment row', () => {
  it('sums up the appointment and marks the next one of today', async () => {
    renderAgenda(SATURDAY_MORNING)

    const row = await appointmentRow('María López')

    expect(row).toHaveTextContent('10:30')
    expect(row).toHaveTextContent('Dobladillo de pantalón, Cambio de cierre')
    expect(row).toHaveTextContent('Ticket 4821 · Cotización $250 MXN')
    expect(row).toHaveTextContent('Próxima')
  })

  it('marks no appointment as next once it started', async () => {
    // Saturday 11:15 in Cancún.
    renderAgenda(new Date('2026-10-24T16:15:00Z'))

    expect(await appointmentRow('María López')).not.toHaveTextContent('Próxima')
  })

  it('marks no appointment as next on another day', async () => {
    renderAgenda(SATURDAY_MORNING)
    await dayHeading()

    await userEvent.click(button('Día siguiente'))
    await userEvent.click(button('Día siguiente'))

    expect(await appointmentRow('Juan Pérez')).not.toHaveTextContent('Próxima')
  })
})

describe('Appointment detail', () => {
  it('asks to choose an appointment before one is chosen', async () => {
    renderAgenda(SATURDAY_MORNING)

    expect(await appointmentDetail()).toHaveTextContent('Elige una cita para ver su detalle.')
  })

  it('shows the chosen appointment', async () => {
    renderAgenda(SATURDAY_MORNING)

    const detail = await chooseAppointment('María López')

    expect(within(detail).getByRole('heading', { name: 'María López' })).toBeInTheDocument()
    expect(detail).toHaveTextContent('Cita de las 10:30')
    expect(detail).toHaveTextContent('Ticket 4821')
    expect(detail).toHaveTextContent('TrabajoDobladillo de pantalón, Cambio de cierre')
    expect(detail).toHaveTextContent('Cotización preliminar$250 MXN')
    expect(detail).toHaveTextContent('WhatsApp998 123 4567')
    expect(await appointmentRow('María López')).toHaveAttribute('aria-current', 'true')
  })

  it('closes the detail with the back button', async () => {
    renderAgenda(SATURDAY_MORNING)
    const detail = await chooseAppointment('María López')

    await userEvent.click(within(detail).getByRole('button', { name: 'Volver a la agenda' }))

    expect(await appointmentDetail()).toHaveTextContent('Elige una cita para ver su detalle.')
    expect(await appointmentRow('María López')).not.toHaveAttribute('aria-current')
  })

  it('has no detail on a day without appointments', async () => {
    renderAgenda(SATURDAY_MORNING)
    await dayHeading()

    await userEvent.click(button('Día anterior'))
    await slotGroup('Antes de ahora')

    expect(screen.queryByRole('region', { name: 'Detalle de la cita' })).not.toBeInTheDocument()
  })
})
