import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import type { Appointment } from '../../agenda/domain/appointment'
import type { WeeklySchedule } from '../../agenda/domain/schedule'
import { InMemoryAgendaRepository } from '../../agenda/infrastructure/in-memory-agenda-repository'
import type { Order } from '../domain/order'
import { InMemoryOrdersRepository } from '../infrastructure/in-memory-orders-repository'
import { OrdersPage } from './OrdersPage'

// Saturday 24 October 2026, 09:00 in Cancún (UTC−5).
const SATURDAY_MORNING = new Date('2026-10-24T14:00:00Z')

const OPEN_ALL_WEEK = { isOpen: true, opensAt: '10:00', closesAt: '18:00' } as const

const SCHEDULE: WeeklySchedule = {
  monday: OPEN_ALL_WEEK,
  tuesday: OPEN_ALL_WEEK,
  wednesday: OPEN_ALL_WEEK,
  thursday: OPEN_ALL_WEEK,
  friday: OPEN_ALL_WEEK,
  saturday: OPEN_ALL_WEEK,
  sunday: OPEN_ALL_WEEK,
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

type OrdersOptions = {
  // Values the random source returns in turn; the last one repeats.
  randomValues?: number[]
  orders?: Order[]
}

export function renderOrders({ randomValues = [0.12345], orders = ORDERS }: OrdersOptions = {}) {
  const agendaRepository = new InMemoryAgendaRepository({
    schedule: SCHEDULE,
    appointments: APPOINTMENTS,
  })
  const ordersRepository = new InMemoryOrdersRepository(orders)
  let call = 0
  const random = () => randomValues[Math.min(call++, randomValues.length - 1)]
  render(
    createElement(OrdersPage, {
      ordersRepository,
      agendaRepository,
      now: () => SATURDAY_MORNING,
      random,
    }),
  )
}

export function ordersInWorkshop(): Promise<HTMLElement> {
  return screen.findByRole('list', { name: 'Pedidos en el taller' })
}

// Each row is the button that opens the order's detail.
export function rowsIn(list: HTMLElement): HTMLElement[] {
  return within(list).getAllByRole('button')
}

export function rowOf(clientName: string): HTMLElement {
  const list = screen.getByRole('list', { name: 'Pedidos en el taller' })
  return within(list).getByRole('button', { name: new RegExp(clientName) })
}

export async function chooseOrder(clientName: string): Promise<HTMLElement> {
  await ordersInWorkshop()
  await userEvent.click(rowOf(clientName))
  return orderDetail()
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

export function button(name: string | RegExp): HTMLElement {
  return screen.getByRole('button', { name })
}
