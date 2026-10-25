import { render, screen, within } from '@testing-library/react'
import { createElement } from 'react'
import type { Appointment } from '../domain/appointment'
import type { CalendarDate } from '../../shared/domain/calendar-date'
import type { WeeklySchedule } from '../domain/schedule'
import { InMemoryAgendaRepository } from '../infrastructure/in-memory-agenda-repository'
import { AgendaPage } from './AgendaPage'

// Saturday 24 October 2026, 09:00 in Cancún (UTC−5), before opening time.
export const SATURDAY_MORNING = new Date('2026-10-24T14:00:00Z')
// Monday 26 October 2026, 09:00 in Cancún.
export const MONDAY_MORNING = new Date('2026-10-26T14:00:00Z')

const WEEKDAY_HOURS = { isOpen: true, opensAt: '10:00', closesAt: '14:00' } as const

const SCHEDULE: WeeklySchedule = {
  monday: WEEKDAY_HOURS,
  tuesday: WEEKDAY_HOURS,
  wednesday: WEEKDAY_HOURS,
  thursday: WEEKDAY_HOURS,
  friday: WEEKDAY_HOURS,
  saturday: { isOpen: true, opensAt: '10:00', closesAt: '12:00' },
  sunday: { isOpen: false },
}

const MARIA_ON_SATURDAY: Appointment = {
  ticket: '4821',
  clientName: 'María López',
  whatsapp: '9981234567',
  date: '2026-10-24',
  time: '10:30',
  quote: { services: ['Dobladillo de pantalón', 'Cambio de cierre'], preliminaryTotalMxn: 250 },
}

const JUAN_ON_MONDAY: Appointment = {
  ticket: '0937',
  clientName: 'Juan Pérez',
  date: '2026-10-26',
  time: '10:00',
  quote: { services: ['Ajuste de cintura'], preliminaryTotalMxn: 180 },
}

type AgendaOptions = {
  blockedDates?: CalendarDate[]
}

export function renderAgenda(now: Date, { blockedDates = [] }: AgendaOptions = {}) {
  const repository = new InMemoryAgendaRepository({
    schedule: SCHEDULE,
    appointments: [MARIA_ON_SATURDAY, JUAN_ON_MONDAY],
    blockedDates,
  })
  render(createElement(AgendaPage, { repository, now: () => now }))
}

export function dayHeading(): Promise<HTMLElement> {
  return screen.findByRole('heading', { level: 2 })
}

export function daySlots(): Promise<HTMLElement> {
  return screen.findByRole('list', { name: 'Horarios del día' })
}

export async function slotAt(time: string): Promise<HTMLElement> {
  const slots = within(await daySlots()).getAllByRole('listitem')
  const slot = slots.find((item) => item.querySelector('time')?.textContent === time)
  if (slot === undefined) throw new Error(`No slot at ${time}`)
  return slot
}

export function button(name: string | RegExp): HTMLElement {
  return screen.getByRole('button', { name })
}
