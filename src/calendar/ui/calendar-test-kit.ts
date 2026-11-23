import { render, screen, within } from '@testing-library/react'
import { createElement } from 'react'
import type { Appointment } from '../../agenda/domain/appointment'
import type { WeeklySchedule } from '../../agenda/domain/schedule'
import { InMemoryAgendaRepository } from '../../agenda/infrastructure/in-memory-agenda-repository'
import { SATURDAY_MORNING } from '../../agenda/ui/agenda-test-kit'
import type { Order } from '../../orders/domain/order'
import { InMemoryOrdersRepository } from '../../orders/infrastructure/in-memory-orders-repository'
import { CARLOS_READY, LUCIA_RECEIVED } from '../../orders/ui/orders-test-kit'
import { AgendaCalendarPage } from './AgendaCalendarPage'

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

const APPOINTMENTS: Appointment[] = [
  {
    ticket: '4821',
    clientName: 'María López',
    whatsapp: '9981234567',
    date: '2026-10-24',
    time: '10:30',
    quote: { services: ['Dobladillo de pantalón', 'Cambio de cierre'], preliminaryTotalMxn: 250 },
  },
  {
    ticket: '0937',
    clientName: 'Juan Pérez',
    date: '2026-10-26',
    time: '10:00',
    quote: { services: ['Ajuste de cintura'], preliminaryTotalMxn: 180 },
  },
  {
    ticket: '5150',
    clientName: 'Ana Martínez',
    date: '2026-11-18',
    time: '11:00',
    quote: { services: ['Ajuste de vestido'], preliminaryTotalMxn: 450 },
  },
]

// Lucía is due on Wednesday 28, Carlos (ready, no WhatsApp) on Sunday 25.
const ORDERS: Order[] = [
  LUCIA_RECEIVED,
  CARLOS_READY,
  {
    ticket: '3301',
    clientName: 'Elena Díaz',
    work: 'Dobladillo de falda',
    finalPriceMxn: 120,
    deliveryDate: '2026-10-20',
    status: 'delivered',
  },
  {
    ticket: '6604',
    clientName: 'Sofía Ramos',
    work: 'Bastilla de pantalón',
    finalPriceMxn: 100,
    deliveryDate: '2026-10-19',
    status: 'cancelled',
  },
]

// Saturday 24 October 2026, 09:00 in Cancún; Monday 12 is blocked.
export function renderAgendaCalendar() {
  const agendaRepository = new InMemoryAgendaRepository({
    schedule: SCHEDULE,
    appointments: [...APPOINTMENTS],
    blockedDates: ['2026-10-12'],
  })
  const ordersRepository = new InMemoryOrdersRepository([...ORDERS])
  render(
    createElement(AgendaCalendarPage, {
      agendaRepository,
      ordersRepository,
      now: () => SATURDAY_MORNING,
      random: () => 0.12345,
    }),
  )
}

// A day of the month grid, named by its long date, e.g. "Sábado 24 de octubre".
export function findDay(name: string): Promise<HTMLElement> {
  return screen.findByRole('group', { name })
}

export function chipsIn(day: HTMLElement): string[] {
  return within(day)
    .queryAllByRole('button')
    .map((chip) => chip.getAttribute('aria-label') ?? '')
    .filter((label) => label.startsWith('Cita') || label.startsWith('Entrega'))
}

export function segment(group: string, name: string): HTMLElement {
  return within(screen.getByRole('group', { name: group })).getByRole('button', { name })
}

export function button(name: string | RegExp): HTMLElement {
  return screen.getByRole('button', { name })
}
