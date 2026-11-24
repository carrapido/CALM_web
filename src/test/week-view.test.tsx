import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { button, dayHeading, renderDayView, segment } from './calendar-test-kit'

describe('Agenda week view', () => {
  it('lists the days of the week being viewed with their appointments', async () => {
    await renderDayView({ blockedDates: ['2026-10-21'] })

    await userEvent.click(segment('Vista', 'Semana'))

    const days = within(await weekDays()).getAllByRole('listitem')
    expect(days).toHaveLength(7)
    expect(days[0]).toHaveTextContent('Lunes 19 de octubre')
    expect(days[0]).toHaveTextContent('Sin citas')
    expect(days[2]).toHaveTextContent('Bloqueado')
    expect(days[5]).toHaveTextContent('Sábado 24 de octubre')
    expect(days[5]).toHaveTextContent('1 cita')
    expect(days[6]).toHaveTextContent('Domingo 25 de octubre')
    expect(days[6]).toHaveTextContent('Cerrado')
  })

  it('opens the day chosen in the week', async () => {
    await renderDayView()
    await userEvent.click(segment('Vista', 'Semana'))
    await weekDays()

    await userEvent.click(button(/Martes 20 de octubre/))

    expect(await dayHeading()).toHaveTextContent('Martes 20 de octubre')
  })

  it('marks the view being shown and goes back to the day', async () => {
    await renderDayView()

    expect(segment('Vista', 'Día')).toHaveAttribute('aria-pressed', 'true')
    expect(segment('Vista', 'Semana')).toHaveAttribute('aria-pressed', 'false')

    await userEvent.click(segment('Vista', 'Semana'))
    await weekDays()
    expect(segment('Vista', 'Semana')).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(segment('Vista', 'Día'))
    expect(await dayHeading()).toHaveTextContent('Hoy, sábado 24 de octubre')
  })
})

function weekDays(): Promise<HTMLElement> {
  return screen.findByRole('list', { name: 'Días de la semana' })
}
