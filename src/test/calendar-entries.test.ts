import { describe, expect, it } from 'vitest'
import type { Appointment } from '../types/appointment'
import type { Order, OrderStatus } from '../utils/order'
import { calendarEntries, entriesOn, visibleEntries, type CalendarEntry } from '../utils/calendar-entries'

function appointment(ticket: string, date: string, time: string): Appointment {
  return {
    ticket,
    clientName: 'Ana Martínez',
    date,
    time,
    quote: { services: ['Ajuste de vestido'], preliminaryTotalMxn: 450 },
  }
}

function order(ticket: string, deliveryDate: string, status: OrderStatus): Order {
  return {
    ticket,
    clientName: 'Carlos Ruiz',
    work: 'Ajuste de saco',
    finalPriceMxn: 350,
    deliveryDate,
    status,
  }
}

function tickets(entries: CalendarEntry[]): string[] {
  return entries.map((entry) => (entry.kind === 'appointment' ? entry.appointment.ticket : entry.order.ticket))
}

describe('calendarEntries', () => {
  it('places appointments on their date and orders on their delivery date', () => {
    const entries = calendarEntries(
      [appointment('4821', '2026-10-24', '10:30')],
      [order('7720', '2026-10-26', 'inProgress')],
    )
    expect(entries).toEqual([
      { kind: 'appointment', date: '2026-10-24', appointment: appointment('4821', '2026-10-24', '10:30') },
      { kind: 'order', date: '2026-10-26', tone: 'active', order: order('7720', '2026-10-26', 'inProgress') },
    ])
  })

  it('lists a day with its appointments by time, then its orders', () => {
    const entries = calendarEntries(
      [appointment('4841', '2026-10-24', '16:30'), appointment('4821', '2026-10-24', '10:30')],
      [order('7720', '2026-10-24', 'ready'), order('6105', '2026-10-24', 'received')],
    )
    expect(tickets(entriesOn(entries, '2026-10-24'))).toEqual(['4821', '4841', '6105', '7720'])
  })

  it('tones an order by where it stands', () => {
    const tones = calendarEntries(
      [],
      [
        order('1', '2026-10-24', 'received'),
        order('2', '2026-10-24', 'inProgress'),
        order('3', '2026-10-24', 'ready'),
        order('4', '2026-10-24', 'onTheWay'),
        order('5', '2026-10-24', 'delivered'),
        order('6', '2026-10-24', 'cancelled'),
      ],
    ).map((entry) => entry.kind === 'order' && entry.tone)
    expect(tones).toEqual(['active', 'active', 'ready', 'ready', 'finished', 'finished'])
  })
})

describe('entriesOn', () => {
  it('keeps only the entries of that day', () => {
    const entries = calendarEntries(
      [appointment('4821', '2026-10-24', '10:30'), appointment('4855', '2026-10-27', '09:30')],
      [order('7720', '2026-10-27', 'ready')],
    )
    expect(tickets(entriesOn(entries, '2026-10-27'))).toEqual(['4855', '7720'])
    expect(entriesOn(entries, '2026-10-25')).toEqual([])
  })
})

describe('visibleEntries', () => {
  const entries = calendarEntries(
    [appointment('4821', '2026-10-24', '10:30')],
    [
      order('6105', '2026-10-24', 'inProgress'),
      order('7720', '2026-10-24', 'ready'),
      order('3390', '2026-10-24', 'delivered'),
      order('2210', '2026-10-24', 'cancelled'),
    ],
  )

  it('shows every appointment and the orders still in the workshop on Todo', () => {
    expect(tickets(visibleEntries(entries, { show: 'all', orders: 'finished' }))).toEqual(['4821', '6105', '7720'])
  })

  it('shows only appointments on Citas', () => {
    expect(tickets(visibleEntries(entries, { show: 'appointments', orders: 'workshop' }))).toEqual(['4821'])
  })

  it('shows the orders in the workshop on Pedidos, En el taller', () => {
    expect(tickets(visibleEntries(entries, { show: 'orders', orders: 'workshop' }))).toEqual(['6105', '7720'])
  })

  it('shows the finished orders on Pedidos, Terminados', () => {
    expect(tickets(visibleEntries(entries, { show: 'orders', orders: 'finished' }))).toEqual(['2210', '3390'])
  })
})
