import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SATURDAY_MORNING, button, dayHeading, daySlots, renderAgenda } from './agenda-test-kit'

describe('Block a day', () => {
  it('blocks an open day without appointments once confirmed, and unblocks it', async () => {
    renderAgenda(SATURDAY_MORNING)
    await goToTuesday()

    await userEvent.click(button('Bloquear este día'))
    expect(screen.getByText('¿Bloquear el martes 27 de octubre?')).toBeInTheDocument()
    await userEvent.click(button('Sí, bloquear el día'))

    expect(await screen.findByText('Día bloqueado')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Horarios del día' })).not.toBeInTheDocument()

    await userEvent.click(button('Desbloquear día'))

    expect(await daySlots()).toBeInTheDocument()
    expect(screen.queryByText('Día bloqueado')).not.toBeInTheDocument()
  })

  it('keeps the day open when the admin changes her mind', async () => {
    renderAgenda(SATURDAY_MORNING)
    await goToTuesday()

    await userEvent.click(button('Bloquear este día'))
    await userEvent.click(button('No, dejarlo abierto'))

    expect(await daySlots()).toBeInTheDocument()
    expect(screen.queryByText(/¿Bloquear el/)).not.toBeInTheDocument()
  })

  it('refuses to block a day that has appointments', async () => {
    renderAgenda(SATURDAY_MORNING)
    await dayHeading()

    await userEvent.click(button('Bloquear este día'))

    expect(screen.getByText('Este día tiene 1 cita. Cancélala primero.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Sí, bloquear el día' })).not.toBeInTheDocument()
    expect(await daySlots()).toBeInTheDocument()
  })
})

async function goToTuesday() {
  await dayHeading()
  await userEvent.click(button('Día siguiente'))
  await userEvent.click(button('Día siguiente'))
  await userEvent.click(button('Día siguiente'))
  expect(await dayHeading()).toHaveTextContent('Martes 27 de octubre')
}
