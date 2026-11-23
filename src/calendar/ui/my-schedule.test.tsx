import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { CalendarDate } from '../../shared/domain/calendar-date'
import { button, dayHeading, daySlots, renderDayView } from './calendar-test-kit'

const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const CLOSES_BEFORE_OPENING = 'La hora de cierre debe ser después de la apertura.'

describe('Mi horario', () => {
  it('shows the hours of each weekday', async () => {
    await openMySchedule()

    const days = screen.getAllByRole('group')
    expect(days.map((day) => day.querySelector('legend')?.textContent)).toEqual(WEEKDAY_NAMES)

    const saturday = weekdayGroup('Sábado')
    expect(within(saturday).getByRole('switch', { name: 'Abierto' })).toBeChecked()
    expect(within(saturday).getByRole('combobox', { name: 'Abre' })).toHaveValue('10:00')
    expect(within(saturday).getByRole('combobox', { name: 'Cierra' })).toHaveValue('12:00')
    expect(within(weekdayGroup('Domingo')).getByRole('switch', { name: 'Abierto' })).not.toBeChecked()
    expect(within(weekdayGroup('Domingo')).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('hides the hours of a day switched off and brings them back when switched on', async () => {
    await openMySchedule()
    const saturdaySwitch = within(weekdayGroup('Sábado')).getByRole('switch', { name: 'Abierto' })

    await userEvent.click(saturdaySwitch)
    expect(within(weekdayGroup('Sábado')).queryByRole('combobox')).not.toBeInTheDocument()

    await userEvent.click(saturdaySwitch)
    expect(closingTime('Sábado')).toHaveValue('12:00')
  })

  it('saves new hours and shows them in the day view', async () => {
    await openMySchedule()

    await userEvent.selectOptions(closingTime('Sábado'), '14:00')
    await userEvent.click(button('Guardar horario'))

    expect(await dayHeading()).toHaveTextContent('Hoy, sábado 24 de octubre')
    expect(within(await daySlots()).getAllByRole('listitem')).toHaveLength(8)
  })

  it('closes a weekday', async () => {
    await openMySchedule()

    await userEvent.click(within(weekdayGroup('Sábado')).getByRole('switch', { name: 'Abierto' }))
    await userEvent.click(button('Guardar horario'))

    expect(await screen.findByText('Cerrado')).toBeInTheDocument()
  })

  it('still lists an appointment left outside the new hours', async () => {
    await openMySchedule()

    await userEvent.selectOptions(closingTime('Sábado'), '10:30')
    await userEvent.click(button('Guardar horario'))

    const slots = within(await daySlots()).getAllByRole('listitem')
    expect(slots).toHaveLength(2)
    expect(slots[1]).toHaveTextContent('10:30')
    expect(slots[1]).toHaveTextContent('María López')
  })

  it('warns about a day as soon as it closes before it opens', async () => {
    await openMySchedule()

    await userEvent.selectOptions(closingTime('Sábado'), '09:30')
    expect(within(weekdayGroup('Sábado')).getByRole('alert')).toHaveTextContent(CLOSES_BEFORE_OPENING)

    await userEvent.selectOptions(closingTime('Sábado'), '13:00')
    expect(within(weekdayGroup('Sábado')).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('refuses to save while a day closes before it opens, and names the day', async () => {
    await openMySchedule()

    await userEvent.selectOptions(closingTime('Sábado'), '09:30')
    await userEvent.click(button('Guardar horario'))

    expect(screen.getByText('No se guardó. Revisa el sábado.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Mi horario' })).toBeInTheDocument()

    await userEvent.click(button('Volver sin guardar'))

    expect(within(await daySlots()).getAllByRole('listitem')).toHaveLength(4)
  })

  it('names every day to fix', async () => {
    await openMySchedule()

    await userEvent.selectOptions(closingTime('Lunes'), '09:30')
    await userEvent.selectOptions(closingTime('Sábado'), '09:30')
    await userEvent.click(button('Guardar horario'))

    expect(screen.getByText('No se guardó. Revisa el lunes y el sábado.')).toBeInTheDocument()
  })
})

describe('Días que no abres', () => {
  it('lists the blocked days still to come, in date order', async () => {
    await openMySchedule({ blockedDates: ['2026-10-28', '2026-10-21', '2026-10-27'] })

    const days = within(await blockedDays()).getAllByRole('listitem')

    expect(days).toHaveLength(2)
    expect(days[0]).toHaveTextContent('Martes 27 de octubre')
    expect(days[1]).toHaveTextContent('Miércoles 28 de octubre')
  })

  it('unblocks a day from the list', async () => {
    await openMySchedule({ blockedDates: ['2026-10-27', '2026-10-28'] })
    await blockedDays()

    await userEvent.click(button('Desbloquear el martes 27 de octubre'))

    await waitFor(async () => {
      expect(within(await blockedDays()).getAllByRole('listitem')).toHaveLength(1)
    })
    expect(within(await blockedDays()).getByRole('listitem')).toHaveTextContent('Miércoles 28 de octubre')
  })

  it('says when no day is blocked', async () => {
    await openMySchedule({ blockedDates: [] })

    expect(await screen.findByText('No tienes días bloqueados.')).toBeInTheDocument()
  })
})

// From the day view, so saving comes back to the day as the old agenda screen did.
async function openMySchedule(options?: { blockedDates: CalendarDate[] }) {
  await renderDayView(options)
  await userEvent.click(button('Mi horario'))
  await screen.findByRole('heading', { level: 2, name: 'Mi horario' })
}

function weekdayGroup(name: string): HTMLElement {
  return screen.getByRole('group', { name })
}

function blockedDays(): Promise<HTMLElement> {
  return screen.findByRole('list', { name: 'Días que no abres' })
}

function closingTime(weekday: string): HTMLElement {
  return within(weekdayGroup(weekday)).getByRole('combobox', { name: 'Cierra' })
}
