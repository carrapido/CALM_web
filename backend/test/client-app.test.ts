// @vitest-environment node
// The client app's API under /api/client (odd/tasks/app-movil-backend.md, contract table), with
// the rules of the retired Edge Functions client-sign-in, client-book and client-update-profile.
import { argon2Verify } from 'hash-wasm'
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import type { BookingCalendar, CatalogService, ClientOrders } from '../src/types/client-app.js'
import { hashNip } from '../src/utils/nip.js'
import {
  InMemoryClientAppRepository, RecordingClientSessions, type AppClient, type ClientAppState,
} from './in-memory-client-app-repository.js'
import { InMemoryClientRepository } from './in-memory-client-repository.js'
import { asAdmin, asClient, CLIENT_USER_ID, RecordingAuthAccounts, testApp } from './test-app.js'

// Rosa signs in to the app with 1234; Lucía has the NIP 4321 but never signed in; Carmen came to
// the counter and has no NIP.
const ROSA: AppClient = {
  id: '1', name: 'Rosa Méndez', phone: '9981234567', nipHash: await hashNip('1234'), userId: CLIENT_USER_ID,
}
const LUCIA: AppClient = {
  id: '2', name: 'Lucía Pérez', phone: '9987654321', nipHash: await hashNip('4321'), userId: null,
}
const CARMEN: AppClient = { id: '3', name: 'Carmen Díaz', phone: '9985550000', nipHash: null, userId: null }
const PUBLIC_ROSA = { id: '1', name: 'Rosa Méndez', phone: '9981234567' }

const SIGNED_OUT = { error: 'Tu sesión terminó. Vuelve a entrar.', code: 'signed_out' }
const REJECTED = { error: 'Tu celular o tu NIP no coinciden.', code: 'rejected' }
const THROTTLED = { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.', code: 'throttled' }
const SESSION_UNAVAILABLE = { error: 'No pudimos abrir tu sesión. Inténtalo de nuevo.', code: 'unavailable' }

const SERVICES: CatalogService[] = [
  { id: '1', name: 'Dobladillo de pantalón', category: 'arreglo', basePriceMxn: 80 },
  { id: '2', name: 'Cambio de cierre', category: 'arreglo', basePriceMxn: 120 },
  { id: '5', name: 'Arreglo de vestido de novia', category: 'arreglo', basePriceMxn: null },
  { id: '7', name: 'Prenda urgente', category: 'extra', basePriceMxn: 100 },
]

// TEST_NOW is 2026-12-01 10:00 in Cancún.
const TOMORROW = '2026-12-02'

function buildClientApp(state: ClientAppState = {}) {
  const clientApp = new InMemoryClientAppRepository({ clients: [ROSA, LUCIA, CARMEN], services: SERVICES, ...state })
  const clientSessions = new RecordingClientSessions()
  const clients = new InMemoryClientRepository()
  const authAccounts = new RecordingAuthAccounts()
  const app = testApp({ clientApp, clientSessions, clients, authAccounts })
  return { app, clientApp, clientSessions, clients, authAccounts }
}

describe('The client guard on /api/client', () => {
  const PROTECTED: [string, string][] = [
    ['get', '/api/client/profile'],
    ['put', '/api/client/profile'],
    ['get', '/api/client/orders'],
    ['delete', '/api/client/appointments/0815'],
    ['post', '/api/client/orders/1290/on-my-way'],
  ]

  it.each(PROTECTED)('answers %s %s with 401 signed_out without a token', async (method, url) => {
    const response = await sendTo(buildClientApp().app, method, url)

    expect(response.status).toBe(401)
    expect(response.body).toEqual(SIGNED_OUT)
  })

  it.each(PROTECTED)('answers %s %s with 401 signed_out to a token Supabase rejects', async (method, url) => {
    const response = await sendTo(buildClientApp().app, method, url).set('Authorization', 'Bearer token-vencido')

    expect(response.status).toBe(401)
    expect(response.body).toEqual(SIGNED_OUT)
  })

  it.each(PROTECTED)('answers %s %s with 401 signed_out to an admin, who is not a client', async (method, url) => {
    const response = await sendTo(buildClientApp().app, method, url).set(asAdmin())

    expect(response.status).toBe(401)
    expect(response.body).toEqual(SIGNED_OUT)
  })

  it('keeps the admin routes closed to a client token', async () => {
    const response = await request(buildClientApp().app).get('/api/services').set(asClient())

    expect(response.status).toBe(403)
    expect(response.body.code).toBe('not_admin')
  })

  it('answers 404 for an unknown client route instead of the admin guard', async () => {
    const response = await request(buildClientApp().app).get('/api/client/nada').set(asClient())

    expect(response.status).toBe(404)
    expect(response.body.code).toBe('not_found')
  })
})

describe('POST /api/client/sign-in', () => {
  it('answers a refresh token and her data for the right NIP, and clears her checks', async () => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).post('/api/client/sign-in').send({ phone: '998 123-4567', nip: '1234' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ refreshToken: `refresh-of-${CLIENT_USER_ID}`, client: PUBLIC_ROSA })
    expect(clientApp.nipChecksOn(ROSA.phone)).toBe(0)
  })

  it('creates and links her auth user on her first sign-in', async () => {
    const { app, clientApp, clientSessions } = buildClientApp()

    const response = await request(app).post('/api/client/sign-in').send({ phone: LUCIA.phone, nip: '4321' })

    expect(response.status).toBe(200)
    expect(response.body.refreshToken).toBe('refresh-of-new-user-of-2')
    expect(clientSessions.createdUsers).toEqual([{ email: '9987654321@clients.calm.app', clientId: '2' }])
    expect(clientApp.stored('2')?.userId).toBe('new-user-of-2')
  })

  it('links the auth user an earlier request created for her instead of creating another', async () => {
    const { app, clientApp, clientSessions } = buildClientApp({ orphansByEmail: { '9987654321@clients.calm.app': 'orphan-user' } })

    const response = await request(app).post('/api/client/sign-in').send({ phone: LUCIA.phone, nip: '4321' })

    expect(response.body.refreshToken).toBe('refresh-of-orphan-user')
    expect(clientSessions.createdUsers).toEqual([])
    expect(clientApp.stored('2')?.userId).toBe('orphan-user')
  })

  it.each([
    ['a wrong NIP', ROSA.phone],
    ['an unknown phone', '9980009999'],
    ['a phone without a NIP', CARMEN.phone],
  ])('answers 401 rejected the same way for %s and counts the check', async (_case, phone) => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).post('/api/client/sign-in').send({ phone, nip: '0000' })

    expect(response.status).toBe(401)
    expect(response.body).toEqual(REJECTED)
    expect(clientApp.nipChecksOn(phone)).toBe(1)
  })

  it.each([
    ['a 9-digit phone', { phone: '998123456', nip: '1234' }, 'phone'],
    ['a missing phone', { nip: '1234' }, 'phone'],
    ['a 3-digit NIP', { phone: ROSA.phone, nip: '123' }, 'nip'],
    ['a NIP that is not text', { phone: ROSA.phone, nip: 1234 }, 'nip'],
    ['an empty body', undefined, 'phone'],
  ])('answers 400 for %s without counting a check', async (_case, body, code) => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).post('/api/client/sign-in').send(body)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Escribe tu celular a 10 dígitos y tu NIP.', code })
    expect(clientApp.nipChecksOn(ROSA.phone)).toBe(0)
  })

  it('answers 429 after five checks, even for the right NIP', async () => {
    const { app } = buildClientApp()
    for (let attempt = 0; attempt < 5; attempt++) {
      await request(app).post('/api/client/sign-in').send({ phone: ROSA.phone, nip: '0000' })
    }

    const response = await request(app).post('/api/client/sign-in').send({ phone: ROSA.phone, nip: '1234' })

    expect(response.status).toBe(429)
    expect(response.body).toEqual(THROTTLED)
  })

  it('answers 500 and keeps her checks when Supabase mints no session', async () => {
    const { app, clientApp, clientSessions } = buildClientApp()
    clientSessions.mintsTokens = false

    const response = await request(app).post('/api/client/sign-in').send({ phone: ROSA.phone, nip: '1234' })

    expect(response.status).toBe(500)
    expect(response.body).toEqual(SESSION_UNAVAILABLE)
    expect(clientApp.nipChecksOn(ROSA.phone)).toBe(1)
  })
})

describe('The public client reads', () => {
  it('lists the active services without a token', async () => {
    const response = await request(buildClientApp().app).get('/api/client/services')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(SERVICES)
  })

  it('answers the booking calendar without a token', async () => {
    const calendar: BookingCalendar = {
      today: '2026-12-01',
      now: '10:00',
      weekly: [{ weekday: 'monday', opensAt: '09:00', closesAt: '18:00' }, { weekday: 'sunday', opensAt: null, closesAt: null }],
      blocked: ['2026-12-07'],
      booked: [{ date: TOMORROW, time: '12:00' }],
    }

    const response = await request(buildClientApp({ calendar }).app).get('/api/client/booking-calendar')

    expect(response.status).toBe(200)
    expect(response.body).toEqual(calendar)
  })
})

describe('The signed-in client reads', () => {
  it('answers her name and phone', async () => {
    const response = await request(buildClientApp().app).get('/api/client/profile').set(asClient())

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ name: ROSA.name, phone: ROSA.phone })
  })

  it('answers her own orders and appointments only', async () => {
    const order = { ticket: '1290', work: 'Cambio de cierre', status: 'ready' as const, finalPriceMxn: 120, deliveryDate: TOMORROW }
    const hers: ClientOrders = {
      orders: [order],
      appointments: [{
        ticket: '0815', date: TOMORROW, time: '12:00', preliminaryTotalMxn: 80, services: ['Dobladillo de pantalón'], hasOrder: false,
      }],
    }
    const others: ClientOrders = { orders: [{ ...order, ticket: '9999' }], appointments: [] }

    const response = await request(buildClientApp({ ordersByClient: { 1: hers, 2: others } }).app)
      .get('/api/client/orders')
      .set(asClient())

    expect(response.status).toBe(200)
    expect(response.body).toEqual(hers)
  })
})

describe('POST /api/client/appointments', () => {
  const BOOKING = { serviceIds: [1, 2], urgent: false, date: TOMORROW, time: '10:00' }
  const BAD_BOOKING = 'Revisa los datos de tu cita.'

  it('books for the signed-in client with the catalog total and no refresh token', async () => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).post('/api/client/appointments').set(asClient()).send(BOOKING)

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      ticket: '1000', client: PUBLIC_ROSA, appointment: { date: TOMORROW, time: '10:00', totalMxn: 200 },
    })
    expect(clientApp.booked).toEqual([
      { clientId: '1', date: TOMORROW, time: '10:00', totalMxn: 200, serviceIds: ['1', '2'], ticket: '1000' },
    ])
  })

  it.each([
    ['adds the urgent charge to an urgent garment', { serviceIds: [1], urgent: true }, ['1', '7'], 180],
    ['counts an in-store price as 0', { serviceIds: [5] }, ['5'], 0],
    ['books a repeated service once', { serviceIds: [1, 1] }, ['1'], 80],
  ])('%s', async (_case, change, serviceIds, totalMxn) => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).post('/api/client/appointments').set(asClient()).send({ ...BOOKING, ...change })

    expect(response.status).toBe(201)
    expect(response.body.appointment.totalMxn).toBe(totalMxn)
    expect(clientApp.booked[0]?.serviceIds).toEqual(serviceIds)
  })

  it.each([
    ['an inactive or unknown service', [1, 6]],
    ['the urgent charge picked as a repair', [7]],
  ])('answers 409 service_unavailable for %s and books nothing', async (_case, serviceIds) => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).post('/api/client/appointments').set(asClient()).send({ ...BOOKING, serviceIds })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'Uno de tus arreglos ya no está disponible. Vuelve a elegirlos.', code: 'service_unavailable' })
    expect(clientApp.booked).toEqual([])
  })

  it.each([
    ['a day that passed', { date: '2026-11-30', time: '12:00' }],
    ['today at the time it is now', { date: '2026-12-01', time: '10:00' }],
    ['63 days ahead', { date: '2027-02-02', time: '10:00' }],
  ])('answers 409 slot_taken for %s', async (_case, slot) => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).post('/api/client/appointments').set(asClient()).send({ ...BOOKING, ...slot })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'Ese horario se acaba de ocupar. Elige otro.', code: 'slot_taken' })
    expect(clientApp.booked).toEqual([])
  })

  it.each([
    ['later today', { date: '2026-12-01', time: '10:30' }],
    ['62 days ahead', { date: '2027-02-01', time: '10:00' }],
  ])('books %s', async (_case, slot) => {
    const response = await request(buildClientApp().app).post('/api/client/appointments').set(asClient()).send({ ...BOOKING, ...slot })

    expect(response.status).toBe(201)
  })

  it.each([
    ['a slot outside the hours, blocked or booked', { closedSlots: [`${TOMORROW} 10:00`] }],
    ['a slot someone takes between the check and the insert', { slotsTakenAtInsert: [`${TOMORROW} 10:00`] }],
  ])('answers 409 slot_taken for %s', async (_case, state) => {
    const { app, clientApp } = buildClientApp(state)

    const response = await request(app).post('/api/client/appointments').set(asClient()).send(BOOKING)

    expect(response.status).toBe(409)
    expect(response.body.code).toBe('slot_taken')
    expect(clientApp.booked).toEqual([])
  })

  it.each([
    ['no services', { serviceIds: [] }, 'serviceIds'],
    ['21 services', { serviceIds: Array.from({ length: 21 }, (_, index) => index + 1) }, 'serviceIds'],
    ['a service id that is not a positive integer', { serviceIds: [1, 0] }, 'serviceIds'],
    ['a service id as text', { serviceIds: ['1'] }, 'serviceIds'],
    ['a date that does not exist', { date: '2026-02-30' }, 'date'],
    ['a missing date', { date: undefined }, 'date'],
    ['a time off the half hour', { time: '10:15' }, 'time'],
    ['an hour past 23', { time: '24:00' }, 'time'],
    ['a contact without a name', { contact: { name: ' ', phone: '9985551234', nip: '4321' } }, 'name'],
    ['a contact with an 81-character name', { contact: { name: 'a'.repeat(81), phone: '9985551234', nip: '4321' } }, 'name'],
    ['a contact with a short phone', { contact: { name: 'Marta', phone: '998555', nip: '4321' } }, 'phone'],
    ['a contact with a short NIP', { contact: { name: 'Marta', phone: '9985551234', nip: '43' } }, 'nip'],
    ['a contact that is not an object', { contact: 'Marta' }, 'contact'],
  ])('answers 400 for %s and books nothing', async (_case, change, code) => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).post('/api/client/appointments').set(asClient()).send({ ...BOOKING, ...change })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: BAD_BOOKING, code })
    expect(clientApp.booked).toEqual([])
  })

  it.each([
    ['without a token', {}],
    ['with an admin token', asAdmin()],
  ])('answers 401 signed_out without a contact %s', async (_case, headers) => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).post('/api/client/appointments').set(headers).send(BOOKING)

    expect(response.status).toBe(401)
    expect(response.body).toEqual(SIGNED_OUT)
    expect(clientApp.booked).toEqual([])
  })

  describe('with a contact', () => {
    const MARTA = { name: '  Marta Gil ', phone: '998 555 1234', nip: '4321' }

    it('creates the client of a new phone with her NIP and answers a refresh token', async () => {
      const { app, clientApp, clientSessions, clients } = buildClientApp()

      const response = await request(app).post('/api/client/appointments').send({ ...BOOKING, contact: MARTA })

      const marta = { id: '100', name: 'Marta Gil', phone: '9985551234' }
      expect(response.status).toBe(201)
      expect(response.body).toEqual({
        ticket: '1000', client: marta, appointment: { date: TOMORROW, time: '10:00', totalMxn: 200 }, refreshToken: 'refresh-of-new-user-of-100',
      })
      expect(await argon2Verify({ password: '4321', hash: clients.storedClient('100')?.nipHash ?? '' })).toBe(true)
      expect(clientSessions.createdUsers).toEqual([{ email: '9985551234@clients.calm.app', clientId: '100' }])
      expect(clientApp.booked[0]?.clientId).toBe('100')
    })

    it('books for the phone her contact names, whatever token comes along', async () => {
      const { app, clientApp } = buildClientApp()
      await clientApp.claimNipAttempt(ROSA.phone)

      const response = await request(app).post('/api/client/appointments').set(asAdmin())
        .send({ ...BOOKING, contact: { name: 'Rosa', phone: ROSA.phone, nip: '1234' } })

      expect(response.status).toBe(201)
      expect(response.body.client).toEqual(PUBLIC_ROSA)
      expect(response.body.refreshToken).toBe(`refresh-of-${CLIENT_USER_ID}`)
      expect(clientApp.nipChecksOn(ROSA.phone)).toBe(0)
    })

    it('answers 401 rejected for a wrong NIP, counts the check and books nothing', async () => {
      const { app, clientApp } = buildClientApp()

      const response = await request(app).post('/api/client/appointments')
        .send({ ...BOOKING, contact: { name: 'Rosa', phone: ROSA.phone, nip: '0000' } })

      expect(response.status).toBe(401)
      expect(response.body).toEqual(REJECTED)
      expect(clientApp.nipChecksOn(ROSA.phone)).toBe(1)
      expect(clientApp.booked).toEqual([])
    })

    it('answers 409 phone_without_nip for a phone with no NIP, without counting a check', async () => {
      const { app, clientApp } = buildClientApp()

      const response = await request(app).post('/api/client/appointments')
        .send({ ...BOOKING, contact: { name: 'Carmen', phone: CARMEN.phone, nip: '1111' } })

      expect(response.status).toBe(409)
      expect(response.body).toEqual({
        error: 'Ese celular ya está registrado en el taller. Escríbele para que te dé tu NIP.', code: 'phone_without_nip',
      })
      expect(clientApp.nipChecksOn(CARMEN.phone)).toBe(0)
      expect(clientApp.booked).toEqual([])
    })

    it('answers 429 while her phone is locked out', async () => {
      const { app, clientApp } = buildClientApp()
      clientApp.lockOut(ROSA.phone)

      const response = await request(app).post('/api/client/appointments')
        .send({ ...BOOKING, contact: { name: 'Rosa', phone: ROSA.phone, nip: '1234' } })

      expect(response.status).toBe(429)
      expect(response.body).toEqual(THROTTLED)
      expect(clientApp.booked).toEqual([])
    })
  })
})

describe('DELETE /api/client/appointments/:ticket', () => {
  it('cancels her appointment and answers 204', async () => {
    const { app, clientApp } = buildClientApp({ cancellable: ['1 0815'] })

    const response = await request(app).delete('/api/client/appointments/0815').set(asClient())

    expect(response.status).toBe(204)
    expect(clientApp.cancelled).toEqual(['0815'])
  })

  it.each([
    ['one she can no longer cancel', []],
    ['another client\'s', ['2 0815']],
  ])('answers 409 appointment_not_cancellable for %s', async (_case, cancellable) => {
    const { app, clientApp } = buildClientApp({ cancellable })

    const response = await request(app).delete('/api/client/appointments/0815').set(asClient())

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: 'Ya no se puede cancelar desde la app: escríbele al taller.', code: 'appointment_not_cancellable',
    })
    expect(clientApp.cancelled).toEqual([])
  })
})

describe('POST /api/client/orders/:ticket/on-my-way', () => {
  it('marks her ready order on the way and answers 204', async () => {
    const { app, clientApp } = buildClientApp({ readyOrders: ['1 1290'] })

    const response = await request(app).post('/api/client/orders/1290/on-my-way').set(asClient())

    expect(response.status).toBe(204)
    expect(clientApp.onTheWay).toEqual(['1290'])
  })

  it.each([
    ['an order that is not ready', []],
    ['another client\'s ready order', ['2 1290']],
  ])('answers 409 order_not_ready for %s', async (_case, readyOrders) => {
    const { app, clientApp } = buildClientApp({ readyOrders })

    const response = await request(app).post('/api/client/orders/1290/on-my-way').set(asClient())

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'Tu pedido ya no está listo para recoger. Escríbele al taller.', code: 'order_not_ready' })
    expect(clientApp.onTheWay).toEqual([])
  })
})

describe('PUT /api/client/profile', () => {
  const NEW_PHONE = '9989990000'

  it('answers her data unchanged when nothing changes, without a NIP check', async () => {
    const { app, clientApp, authAccounts } = buildClientApp()

    const response = await request(app).put('/api/client/profile').set(asClient()).send({ phone: ROSA.phone })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ client: PUBLIC_ROSA })
    expect(clientApp.nipChecksOn(ROSA.phone)).toBe(0)
    expect(authAccounts.emailChanges).toEqual([])
  })

  it('changes her phone and renames her auth email', async () => {
    const { app, clientApp, authAccounts } = buildClientApp()

    const response = await request(app).put('/api/client/profile').set(asClient()).send({ phone: '998 999-0000' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ client: { ...PUBLIC_ROSA, phone: NEW_PHONE } })
    expect(clientApp.stored('1')?.phone).toBe(NEW_PHONE)
    expect(authAccounts.emailChanges).toEqual([{ userId: CLIENT_USER_ID, email: '9989990000@clients.calm.app' }])
  })

  it('answers 409 phone_taken for another client\'s phone and changes nothing', async () => {
    const { app, clientApp, authAccounts } = buildClientApp()

    const response = await request(app).put('/api/client/profile').set(asClient()).send({ phone: LUCIA.phone })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'Ese celular ya lo usa otra cuenta.', code: 'phone_taken' })
    expect(clientApp.stored('1')?.phone).toBe(ROSA.phone)
    expect(authAccounts.emailChanges).toEqual([])
  })

  it('answers 400 phone for a short phone', async () => {
    const response = await request(buildClientApp().app).put('/api/client/profile').set(asClient()).send({ phone: '99812' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Escribe tu celular a 10 dígitos.', code: 'phone' })
  })

  it('stores a new NIP after checking the current one, and clears her checks', async () => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).put('/api/client/profile').set(asClient())
      .send({ phone: ROSA.phone, currentNip: '1234', newNip: '5678' })

    expect(response.status).toBe(200)
    expect(await argon2Verify({ password: '5678', hash: clientApp.stored('1')?.nipHash ?? '' })).toBe(true)
    expect(clientApp.nipChecksOn(ROSA.phone)).toBe(0)
  })

  it('answers 401 current_nip for a wrong current NIP, counts the check and keeps her NIP', async () => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).put('/api/client/profile').set(asClient())
      .send({ phone: ROSA.phone, currentNip: '0000', newNip: '5678' })

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Tu NIP actual no coincide.', code: 'current_nip' })
    expect(clientApp.stored('1')?.nipHash).toBe(ROSA.nipHash)
    expect(clientApp.nipChecksOn(ROSA.phone)).toBe(1)
  })

  it.each([
    ['a short new NIP', '56', 'El NIP nuevo necesita 4 dígitos.'],
    ['a new NIP equal to the current one', '1234', 'El NIP nuevo debe ser distinto del actual.'],
  ])('answers 400 new_nip for %s and keeps her NIP', async (_case, newNip, error) => {
    const { app, clientApp } = buildClientApp()

    const response = await request(app).put('/api/client/profile').set(asClient())
      .send({ phone: ROSA.phone, currentNip: '1234', newNip })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error, code: 'new_nip' })
    expect(clientApp.stored('1')?.nipHash).toBe(ROSA.nipHash)
  })

  it('answers 429 while her current phone is locked out', async () => {
    const { app, clientApp } = buildClientApp()
    clientApp.lockOut(ROSA.phone)

    const response = await request(app).put('/api/client/profile').set(asClient())
      .send({ phone: ROSA.phone, currentNip: '1234', newNip: '5678' })

    expect(response.status).toBe(429)
    expect(response.body).toEqual(THROTTLED)
  })
})

function sendTo(app: ReturnType<typeof testApp>, method: string, url: string) {
  const agent = request(app)
  if (method === 'get') return agent.get(url)
  if (method === 'put') return agent.put(url)
  if (method === 'delete') return agent.delete(url)
  return agent.post(url)
}
