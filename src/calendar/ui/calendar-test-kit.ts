import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { Appointment } from '../../agenda/domain/appointment'
import type { WeeklySchedule } from '../../agenda/domain/schedule'
import { InMemoryAgendaRepository } from '../../agenda/infrastructure/in-memory-agenda-repository'
import type { Order } from '../../orders/domain/order'
import { InMemoryOrdersRepository } from '../../orders/infrastructure/in-memory-orders-repository'
import type { CalendarDate } from '../../shared/domain/calendar-date'
import { AgendaCalendarPage } from './AgendaCalendarPage'

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

const APPOINTMENTS: Appointment[] = [
  MARIA_ON_SATURDAY,
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

// What "Nuevo pedido" and "Citas pendientes" choose from: today's, a recent one, one too old
// to wait for (Rosa) and a future one.
export const APPOINTMENTS_AWAITING_ORDERS: Appointment[] = [
  MARIA_ON_SATURDAY,
  {
    ticket: '0937',
    clientName: 'Juan Pérez',
    date: '2026-10-23',
    time: '11:00',
    quote: { services: ['Ajuste de cintura'], preliminaryTotalMxn: 180 },
  },
  {
    ticket: '2468',
    clientName: 'Rosa Chan',
    date: '2026-10-10',
    time: '12:00',
    quote: { services: ['Bastilla'], preliminaryTotalMxn: 100 },
  },
  {
    ticket: '1357',
    clientName: 'Pedro Canul',
    date: '2026-10-26',
    time: '10:00',
    quote: { services: ['Ajuste de saco'], preliminaryTotalMxn: 300 },
  },
]

export const LUCIA_RECEIVED: Order = {
  ticket: '5512',
  clientName: 'Lucía Gómez',
  whatsapp: '9985551234',
  work: 'Ajuste de vestido de novia',
  finalPriceMxn: 900,
  deliveryDate: '2026-10-28',
  status: 'received',
}

export const CARLOS_READY: Order = {
  ticket: '7720',
  clientName: 'Carlos Ruiz',
  work: 'Cambio de cierre de chamarra',
  finalPriceMxn: 150,
  deliveryDate: '2026-10-25',
  status: 'ready',
}

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

export const MARIA_CHIP = 'Cita por recibir, 10:30, María López, ticket 4821'
export const LUCIA_CHIP = 'Entrega del pedido 5512, Lucía Gómez, Recibido'
export const CARLOS_CHIP = 'Entrega del pedido 7720, Carlos Ruiz, Listo para recoger'

type AgendaCalendarOptions = {
  now?: Date
  appointments?: Appointment[]
  orders?: Order[]
  blockedDates?: CalendarDate[]
  // Values the random source returns in turn; the last one repeats.
  randomValues?: number[]
}

// By default Saturday 24 October 2026, 09:00 in Cancún; Monday 12 is blocked.
export function renderAgendaCalendar({
  now = SATURDAY_MORNING,
  appointments = APPOINTMENTS,
  orders = ORDERS,
  blockedDates = ['2026-10-12'],
  randomValues = [0.12345],
}: AgendaCalendarOptions = {}) {
  const agendaRepository = new InMemoryAgendaRepository({
    schedule: SCHEDULE,
    appointments: [...appointments],
    blockedDates: [...blockedDates],
  })
  const ordersRepository = new InMemoryOrdersRepository([...orders])
  let call = 0
  const random = () => randomValues[Math.min(call++, randomValues.length - 1)]
  render(createElement(AgendaCalendarPage, { agendaRepository, ordersRepository, now: () => now, random }))
}

// The page opens on the month; the day view is one "Vista" choice away.
export async function renderDayView(options?: AgendaCalendarOptions): Promise<HTMLElement> {
  renderAgendaCalendar(options)
  await findDay('Sábado 24 de octubre')
  await userEvent.click(segment('Vista', 'Día'))
  return dayHeading()
}

// A day of the month grid, named by its long date, e.g. "Sábado 24 de octubre".
export function findDay(name: string): Promise<HTMLElement> {
  return screen.findByRole('group', { name })
}

export function monthGrid(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: 'Calendario del mes' })
}

export function chipsIn(container: HTMLElement): string[] {
  return within(container)
    .queryAllByRole('button')
    .map((chip) => chip.getAttribute('aria-label') ?? '')
    .filter((label) => label.startsWith('Cita') || label.startsWith('Entrega'))
}

// The order chips of the month, in calendar order.
export async function orderChips(): Promise<string[]> {
  return chipsIn(await monthGrid()).filter((label) => label.startsWith('Entrega'))
}

export async function chooseChip(dayName: string, chipName: string) {
  const day = await findDay(dayName)
  await userEvent.click(within(day).getByRole('button', { name: chipName }))
}

export function chip(dayName: string, chipName: string): HTMLElement {
  return within(screen.getByRole('group', { name: dayName })).getByRole('button', { name: chipName })
}

export function segment(group: string, name: string): HTMLElement {
  return within(screen.getByRole('group', { name: group })).getByRole('button', { name })
}

export function button(name: string | RegExp): HTMLElement {
  return screen.getByRole('button', { name })
}

export async function searchTicket(ticket: string) {
  await userEvent.type(screen.getByRole('textbox', { name: 'Buscar por ticket' }), ticket)
  await userEvent.click(button('Buscar'))
}

export function dayHeading(): Promise<HTMLElement> {
  return screen.findByRole('heading', { level: 2 })
}

// Present once the day has loaded; holds the slot lists, notices and the block control.
export function daySlots(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: 'Horarios del día' })
}

export function slotGroup(name: 'Antes de ahora' | 'Más tarde'): Promise<HTMLElement> {
  return screen.findByRole('list', { name })
}

export async function slotAt(time: string): Promise<HTMLElement> {
  const slots = within(await daySlots()).getAllByRole('listitem')
  const slot = slots.find((item) => item.querySelector('time')?.textContent === time)
  if (slot === undefined) throw new Error(`No slot at ${time}`)
  return slot
}

export async function appointmentRow(clientName: string): Promise<HTMLElement> {
  return within(await daySlots()).findByRole('button', { name: new RegExp(clientName) })
}

export function appointmentDetail(): Promise<HTMLElement> {
  return screen.findByRole('region', { name: 'Detalle de la cita' })
}

export async function chooseAppointment(clientName: string): Promise<HTMLElement> {
  await userEvent.click(await appointmentRow(clientName))
  return appointmentDetail()
}

export function orderDetail(): HTMLElement {
  return screen.getByRole('region', { name: 'Detalle del pedido' })
}

export function currentStep(detail: HTMLElement): string | null | undefined {
  const progress = within(detail).getByRole('list', { name: 'Avance del pedido' })
  return progress.querySelector('[aria-current="step"]')?.textContent
}

// The value a fact list gives for a term, e.g. "Entrega".
export function fact(detail: HTMLElement, term: string): string | null | undefined {
  return within(detail).getByText(term).nextElementSibling?.textContent
}
