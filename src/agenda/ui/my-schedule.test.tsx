import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { SATURDAY_MORNING, button, dayHeading, daySlots, renderAgenda } from './agenda-test-kit'

const WEEKDAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

describe('Mi horario', () => {
  it('shows the hours of each weekday', async () => {
    await openMySchedule()

    const days = screen.getAllByRole('group')
    expect(days.map((day) => day.querySelector('legend')?.textContent)).toEqual(WEEKDAY_NAMES)

    const saturday = weekdayGroup('Sábado')
    expect(within(saturday).getByRole('checkbox', { name: 'Abierto' })).toBeChecked()
    expect(within(saturday).getByRole('combobox', { name: 'Abre' })).toHaveValue('10:00')
    expect(within(saturday).getByRole('combobox', { name: 'Cierra' })).toHaveValue('12:00')
    expect(within(weekdayGroup('Domingo')).getByRole('checkbox', { name: 'Abierto' })).not.toBeChecked()
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

    await userEvent.click(within(weekdayGroup('Sábado')).getByRole('checkbox', { name: 'Abierto' }))
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

  it('refuses a closing time that is not after the opening time', async () => {
    await openMySchedule()

    await userEvent.selectOptions(closingTime('Sábado'), '09:30')
    await userEvent.click(button('Guardar horario'))

    expect(within(weekdayGroup('Sábado')).getByText('La hora de cierre debe ser después de la apertura')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Mi horario' })).toBeInTheDocument()

    await userEvent.click(button('Volver sin guardar'))

    expect(within(await daySlots()).getAllByRole('listitem')).toHaveLength(4)
  })
})

async function openMySchedule() {
  renderAgenda(SATURDAY_MORNING)
  await dayHeading()
  await userEvent.click(button('Mi horario'))
  await screen.findByRole('heading', { level: 2, name: 'Mi horario' })
}

function weekdayGroup(name: string): HTMLElement {
  return screen.getByRole('group', { name })
}

function closingTime(weekday: string): HTMLElement {
  return within(weekdayGroup(weekday)).getByRole('combobox', { name: 'Cierra' })
}
