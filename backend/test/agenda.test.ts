// @vitest-environment node
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import type { Appointment, WeeklySchedule } from '../src/types/agenda.js'
import { InMemoryAgendaRepository } from './in-memory-agenda-repository.js'
import { postgresError } from './postgres-error.js'
import { ADMIN_ID, asAdmin, testApp } from './test-app.js'

const WEEK: WeeklySchedule = {
  monday: { isOpen: true, opensAt: '09:00', closesAt: '18:00' },
  tuesday: { isOpen: true, opensAt: '09:30', closesAt: '14:00' },
  wednesday: { isOpen: false },
  thursday: { isOpen: true, opensAt: '10:00', closesAt: '10:30' },
  friday: { isOpen: true, opensAt: '09:00', closesAt: '18:00' },
  saturday: { isOpen: true, opensAt: '10:00', closesAt: '14:00' },
  sunday: { isOpen: false },
}
const ANA: Appointment = {
  ticket: '0427',
  clientName: 'Ana López',
  whatsapp: '9981234567',
  date: '2026-06-01',
  time: '10:00',
  quote: { services: ['Parche', 'Dobladillo'], preliminaryTotalMxn: 120 },
}
const WALK_IN: Appointment = {
  ticket: '0427',
  clientName: 'Rosa',
  date: '2026-06-03',
  time: '16:30',
  quote: { services: ['Cierre'], preliminaryTotalMxn: 60 },
}
const LATER: Appointment = { ...ANA, ticket: '0500', date: '2026-07-01' }

const WEEK_PROBLEM = 'El horario trae los siete días de la semana, de lunes a domingo.'
const HOURS_PROBLEM = 'Cada día indica isOpen; un día abierto abre y cierra a una hora en punto o y media (HH:MM).'
const ORDER_PROBLEM = 'La hora de cierre es posterior a la de apertura.'
const DATE_PROBLEM = 'La fecha no es válida; usa el formato AAAA-MM-DD.'
const RANGE_PROBLEM = 'Indica from y to en formato AAAA-MM-DD, con from igual o anterior a to.'
const TICKET_PROBLEM = 'El folio es de 4 dígitos.'

function agendaApp() {
  const agenda = new InMemoryAgendaRepository({
    schedule: WEEK,
    blocked: ['2026-06-10', '2026-05-20'],
    appointments: [ANA, WALK_IN, LATER],
  })
  return { app: testApp({ agenda }), agenda }
}

function invalid(message: string) {
  return { error: message, code: 'invalid_input' }
}

describe('the agenda routes', () => {
  it('answer 401 without a session', async () => {
    const response = await request(agendaApp().app).get('/api/schedule')

    expect(response.status).toBe(401)
  })
})

describe('GET /api/schedule', () => {
  it('answers the week the panel uses', async () => {
    const response = await request(agendaApp().app).get('/api/schedule').set(asAdmin())

    expect(response.status).toBe(200)
    expect(response.body).toEqual(WEEK)
  })
})

describe('PUT /api/schedule', () => {
  const NEW_WEEK: WeeklySchedule = { ...WEEK, monday: { isOpen: false }, sunday: { isOpen: true, opensAt: '06:00', closesAt: '22:00' } }

  it('replaces the week, records the admin and answers 200 with it', async () => {
    const { app, agenda } = agendaApp()

    const response = await request(app).put('/api/schedule').set(asAdmin()).send({ schedule: NEW_WEEK })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(NEW_WEEK)
    expect(await agenda.weeklySchedule()).toEqual(NEW_WEEK)
    expect(agenda.scheduleUpdatedBy).toBe(ADMIN_ID)
  })

  it('keeps only the hours of an open day and drops them from a closed one', async () => {
    const { app, agenda } = agendaApp()
    const schedule = { ...NEW_WEEK, wednesday: { isOpen: false, opensAt: '09:00', closesAt: '10:00' } }

    const response = await request(app).put('/api/schedule').set(asAdmin()).send({ schedule })

    expect(response.status).toBe(200)
    expect(await agenda.weeklySchedule()).toEqual(NEW_WEEK)
  })

  it.each([
    ['no body', undefined, WEEK_PROBLEM],
    ['no schedule', { week: NEW_WEEK }, WEEK_PROBLEM],
    ['a missing weekday', { schedule: { ...NEW_WEEK, sunday: undefined } }, WEEK_PROBLEM],
    ['an unknown weekday', { schedule: { ...NEW_WEEK, domingo: { isOpen: false } } }, WEEK_PROBLEM],
    ['a day without isOpen', { schedule: { ...NEW_WEEK, monday: {} } }, HOURS_PROBLEM],
    ['an isOpen as text', { schedule: { ...NEW_WEEK, monday: { isOpen: 'false' } } }, HOURS_PROBLEM],
    ['an open day without hours', { schedule: { ...NEW_WEEK, monday: { isOpen: true } } }, HOURS_PROBLEM],
    ['a time at a quarter', { schedule: { ...NEW_WEEK, monday: { isOpen: true, opensAt: '09:15', closesAt: '18:00' } } }, HOURS_PROBLEM],
    ['a time with seconds', { schedule: { ...NEW_WEEK, monday: { isOpen: true, opensAt: '09:00:00', closesAt: '18:00' } } }, HOURS_PROBLEM],
    ['hour 24', { schedule: { ...NEW_WEEK, monday: { isOpen: true, opensAt: '09:00', closesAt: '24:00' } } }, HOURS_PROBLEM],
    ['a time without leading zero', { schedule: { ...NEW_WEEK, monday: { isOpen: true, opensAt: '9:00', closesAt: '18:00' } } }, HOURS_PROBLEM],
    ['closing before opening', { schedule: { ...NEW_WEEK, monday: { isOpen: true, opensAt: '18:00', closesAt: '09:00' } } }, ORDER_PROBLEM],
    ['closing when opening', { schedule: { ...NEW_WEEK, monday: { isOpen: true, opensAt: '09:00', closesAt: '09:00' } } }, ORDER_PROBLEM],
  ])('answers 400 for %s and keeps the week', async (_case, body, message) => {
    const { app, agenda } = agendaApp()

    const response = await request(app).put('/api/schedule').set(asAdmin()).send(body)

    expect(response.status).toBe(400)
    expect(response.body).toEqual(invalid(message))
    expect(await agenda.weeklySchedule()).toEqual(WEEK)
    expect(agenda.scheduleUpdatedBy).toBeUndefined()
  })
})

describe('GET /api/blocked-dates', () => {
  it('lists the blocked days in order', async () => {
    const response = await request(agendaApp().app).get('/api/blocked-dates').set(asAdmin())

    expect(response.status).toBe(200)
    expect(response.body).toEqual(['2026-05-20', '2026-06-10'])
  })
})

describe('POST /api/blocked-dates', () => {
  it('blocks the day for the admin and answers 201', async () => {
    const { app, agenda } = agendaApp()

    const response = await request(app).post('/api/blocked-dates').set(asAdmin()).send({ date: '2026-06-15' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({ date: '2026-06-15' })
    expect(await agenda.blockedDates()).toEqual(['2026-05-20', '2026-06-10', '2026-06-15'])
    expect(agenda.blockedBy.get('2026-06-15')).toBe(ADMIN_ID)
  })

  it('answers 201 again for a day already blocked and keeps it once', async () => {
    const { app, agenda } = agendaApp()

    const response = await request(app).post('/api/blocked-dates').set(asAdmin()).send({ date: '2026-06-10' })

    expect(response.status).toBe(201)
    expect(await agenda.blockedDates()).toEqual(['2026-05-20', '2026-06-10'])
  })

  it.each([
    ['no body', undefined],
    ['a date as a number', { date: 20260615 }],
    ['a day-first date', { date: '15-06-2026' }],
    ['a date with a time', { date: '2026-06-15T00:00:00Z' }],
    ['a day that does not exist', { date: '2026-02-30' }],
    ['month 13', { date: '2026-13-01' }],
  ])('answers 400 for %s and blocks nothing', async (_case, body) => {
    const { app, agenda } = agendaApp()

    const response = await request(app).post('/api/blocked-dates').set(asAdmin()).send(body)

    expect(response.status).toBe(400)
    expect(response.body).toEqual(invalid(DATE_PROBLEM))
    expect(await agenda.blockedDates()).toEqual(['2026-05-20', '2026-06-10'])
  })
})

describe('DELETE /api/blocked-dates/:date', () => {
  it('unblocks the day and answers 204', async () => {
    const { app, agenda } = agendaApp()

    const response = await request(app).delete('/api/blocked-dates/2026-06-10').set(asAdmin())

    expect(response.status).toBe(204)
    expect(response.text).toBe('')
    expect(await agenda.blockedDates()).toEqual(['2026-05-20'])
  })

  it('answers 400 for an invalid date and unblocks nothing', async () => {
    const { app, agenda } = agendaApp()

    const response = await request(app).delete('/api/blocked-dates/2026-02-30').set(asAdmin())

    expect(response.status).toBe(400)
    expect(response.body).toEqual(invalid(DATE_PROBLEM))
    expect(await agenda.blockedDates()).toEqual(['2026-05-20', '2026-06-10'])
  })
})

describe('GET /api/appointments', () => {
  it('lists the appointments from one day to another, both included', async () => {
    const response = await request(agendaApp().app)
      .get('/api/appointments?from=2026-06-01&to=2026-06-30')
      .set(asAdmin())

    expect(response.status).toBe(200)
    expect(response.body).toEqual([ANA, WALK_IN])
  })

  it('accepts a range of one day', async () => {
    const response = await request(agendaApp().app)
      .get('/api/appointments?from=2026-07-01&to=2026-07-01')
      .set(asAdmin())

    expect(response.status).toBe(200)
    expect(response.body).toEqual([LATER])
  })

  it.each([
    ['no range', ''],
    ['no to', '?from=2026-06-01'],
    ['no from', '?to=2026-06-30'],
    ['an invalid from', '?from=2026-6-1&to=2026-06-30'],
    ['an impossible to', '?from=2026-06-01&to=2026-06-31'],
    ['from after to', '?from=2026-06-30&to=2026-06-01'],
    ['a repeated from', '?from=2026-06-01&from=2026-06-02&to=2026-06-30'],
  ])('answers 400 for %s', async (_case, query) => {
    const response = await request(agendaApp().app).get(`/api/appointments${query}`).set(asAdmin())

    expect(response.status).toBe(400)
    expect(response.body).toEqual(invalid(RANGE_PROBLEM))
  })
})

describe('DELETE /api/appointments/:ticket', () => {
  it('cancels only the appointment with that ticket on that date and answers 204', async () => {
    const { app, agenda } = agendaApp()

    const response = await request(app).delete('/api/appointments/0427?date=2026-06-03').set(asAdmin())

    expect(response.status).toBe(204)
    expect(response.text).toBe('')
    expect(await agenda.appointmentsBetween('2026-01-01', '2026-12-31')).toEqual([ANA, LATER])
  })

  it('answers 409 when an order already points to the appointment and keeps it', async () => {
    const { app, agenda } = agendaApp()
    agenda.cancelAppointment = async () => {
      throw postgresError('23503', 'still referenced from table "orders"', 'orders_appointment_id_fkey')
    }

    const response = await request(app).delete('/api/appointments/0427?date=2026-06-03').set(asAdmin())

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: 'Esta cita ya tiene un pedido; cancela o entrega el pedido primero.',
      code: 'appointment_has_order',
    })
    expect(await agenda.appointmentsBetween('2026-01-01', '2026-12-31')).toEqual([ANA, WALK_IN, LATER])
  })

  it('answers 404 when that date has no appointment with that ticket', async () => {
    const { app, agenda } = agendaApp()

    const response = await request(app).delete('/api/appointments/0427?date=2026-07-01').set(asAdmin())

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'No hay una cita con ese folio en esa fecha.', code: 'not_found' })
    expect(await agenda.appointmentsBetween('2026-01-01', '2026-12-31')).toEqual([ANA, WALK_IN, LATER])
  })

  it.each(['427', '04270', 'abcd'])('answers 400 for the ticket %s', async (ticket) => {
    const response = await request(agendaApp().app)
      .delete(`/api/appointments/${ticket}?date=2026-06-01`)
      .set(asAdmin())

    expect(response.status).toBe(400)
    expect(response.body).toEqual(invalid(TICKET_PROBLEM))
  })

  it.each([
    ['no date', ''],
    ['an invalid date', '?date=2026-06-31'],
  ])('answers 400 for %s and cancels nothing', async (_case, query) => {
    const { app, agenda } = agendaApp()

    const response = await request(app).delete(`/api/appointments/0427${query}`).set(asAdmin())

    expect(response.status).toBe(400)
    expect(response.body).toEqual(invalid(DATE_PROBLEM))
    expect(await agenda.appointmentsBetween('2026-01-01', '2026-12-31')).toEqual([ANA, WALK_IN, LATER])
  })
})
