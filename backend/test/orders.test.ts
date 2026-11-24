// @vitest-environment node
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import type { Order } from '../src/types/order.js'
import { InMemoryOrderRepository, type ScheduledAppointment } from './in-memory-order-repository.js'
import { asAdmin, testApp } from './test-app.js'

const ANA_APPOINTMENT: ScheduledAppointment = {
  date: '2026-05-14',
  time: '10:30',
  client: { name: 'Ana López', whatsapp: '9981234567' },
}
const FREE_APPOINTMENT: ScheduledAppointment = {
  date: '2026-05-15',
  time: '12:00',
  client: { name: 'Lucía Méndez', whatsapp: '9987654321' },
}
const ANA_HEM: Order = {
  ticket: '0427',
  clientName: 'Ana López',
  whatsapp: '9981234567',
  work: 'Dobladillo de pantalón',
  finalPriceMxn: 120,
  deliveryDate: '2026-05-20',
  status: 'inProgress',
  appointment: { date: '2026-05-14', time: '10:30' },
}
const ROSA_ZIPPER: Order = {
  ticket: '1290',
  clientName: 'Rosa Pérez',
  work: 'Cambio de cierre',
  finalPriceMxn: 80,
  deliveryDate: '2026-05-18',
  status: 'ready',
}
const OLD_DELIVERED: Order = {
  ticket: '1290',
  clientName: 'Marta Ruiz',
  work: 'Parche',
  finalPriceMxn: 40,
  deliveryDate: '2026-04-02',
  status: 'delivered',
}
const CANCELLED: Order = { ...OLD_DELIVERED, ticket: '7777', status: 'cancelled' }

const NEW_WALK_IN = {
  ticket: '5310',
  clientName: 'Carmen Díaz',
  whatsapp: '9980001111',
  work: 'Ajuste de vestido',
  finalPriceMxn: 250,
  deliveryDate: '2026-05-22',
  status: 'received',
}
const NEW_FROM_APPOINTMENT = {
  ticket: '0815',
  clientName: 'Lucía Méndez',
  whatsapp: '9987654321',
  work: 'Bastilla',
  finalPriceMxn: 90,
  deliveryDate: '2026-05-19',
  status: 'received',
  appointment: { date: '2026-05-15', time: '12:00' },
}
const CHANGES = { work: 'Dobladillo y parche', finalPriceMxn: 160, deliveryDate: '2026-05-21', status: 'ready' }

const TICKET_PROBLEM = { error: 'El folio son 4 dígitos.', code: 'ticket' }
const WORK_PROBLEM = { error: 'Describe el trabajo del pedido.', code: 'work' }
const PRICE_PROBLEM = { error: 'El precio final es un entero de 0 o más.', code: 'finalPriceMxn' }
const DATE_PROBLEM = { error: 'La fecha de entrega es una fecha AAAA-MM-DD.', code: 'deliveryDate' }
const STATUS_PROBLEM = { error: 'El estado del pedido no es válido.', code: 'status' }
const NAME_PROBLEM = { error: 'El nombre de la clienta es obligatorio.', code: 'clientName' }
const WHATSAPP_PROBLEM = { error: 'El WhatsApp son 10 dígitos.', code: 'whatsapp' }
const APPOINTMENT_PROBLEM = {
  error: 'La cita es una fecha AAAA-MM-DD y una hora HH:MM.',
  code: 'appointment',
}

// Ana's order from her appointment, Rosa's walk-in order and two finished ones; Lucía's
// appointment has no order yet.
function ordersApp() {
  const orders = new InMemoryOrderRepository(
    [ANA_HEM, ROSA_ZIPPER, OLD_DELIVERED, CANCELLED],
    [ANA_APPOINTMENT, FREE_APPOINTMENT],
    [{ name: 'Rosa Pérez' }],
  )
  return { app: testApp({ orders }), orders }
}

const ALL_ORDERS_BY_DATE = [OLD_DELIVERED, CANCELLED, ROSA_ZIPPER, ANA_HEM]

describe('GET /api/orders', () => {
  it('lists every order by delivery date with its client and appointment', async () => {
    const response = await request(ordersApp().app).get('/api/orders').set(asAdmin())

    expect(response.status).toBe(200)
    expect(response.body).toEqual(ALL_ORDERS_BY_DATE)
  })

  it('answers 401 without a session token', async () => {
    const response = await request(ordersApp().app).get('/api/orders')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Inicia sesión para continuar.', code: 'unauthenticated' })
  })
})

describe('POST /api/orders', () => {
  it('adds an order from an appointment for its client and answers 201 with it', async () => {
    const { app, orders } = ordersApp()

    const response = await request(app).post('/api/orders').set(asAdmin()).send(NEW_FROM_APPOINTMENT)

    expect(response.status).toBe(201)
    expect(response.body).toEqual(NEW_FROM_APPOINTMENT)
    expect(await orders.all()).toContainEqual(NEW_FROM_APPOINTMENT)
  })

  it('takes the client from the appointment, not from the body', async () => {
    const response = await request(ordersApp().app)
      .post('/api/orders')
      .set(asAdmin())
      .send({ ...NEW_FROM_APPOINTMENT, clientName: '', whatsapp: undefined })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ clientName: 'Lucía Méndez', whatsapp: '9987654321' })
  })

  it('adds a walk-in order for a new client, without spaces around her name', async () => {
    const { app, orders } = ordersApp()

    const response = await request(app)
      .post('/api/orders')
      .set(asAdmin())
      .send({ ...NEW_WALK_IN, clientName: '  Carmen Díaz  ' })

    expect(response.status).toBe(201)
    expect(response.body).toEqual(NEW_WALK_IN)
    expect(await orders.all()).toContainEqual(NEW_WALK_IN)
  })

  it('gives a walk-in order to the client already stored under that phone', async () => {
    const response = await request(ordersApp().app)
      .post('/api/orders')
      .set(asAdmin())
      .send({ ...NEW_WALK_IN, clientName: 'Anita', whatsapp: ANA_APPOINTMENT.client.whatsapp })

    expect(response.status).toBe(201)
    expect(response.body).toMatchObject({ clientName: 'Ana López', whatsapp: '9981234567' })
  })

  it('adds a walk-in order without a phone', async () => {
    const { whatsapp: _whatsapp, ...withoutPhone } = NEW_WALK_IN

    const response = await request(ordersApp().app).post('/api/orders').set(asAdmin()).send(withoutPhone)

    expect(response.status).toBe(201)
    expect(response.body).toEqual(withoutPhone)
  })

  it('reuses the ticket of a delivered order', async () => {
    const response = await request(ordersApp().app)
      .post('/api/orders')
      .set(asAdmin())
      .send({ ...NEW_WALK_IN, ticket: CANCELLED.ticket })

    expect(response.status).toBe(201)
  })

  it.each([
    ['a missing ticket', { ...NEW_WALK_IN, ticket: undefined }, TICKET_PROBLEM],
    ['a 3-digit ticket', { ...NEW_WALK_IN, ticket: '123' }, TICKET_PROBLEM],
    ['a ticket with letters', { ...NEW_WALK_IN, ticket: '12a4' }, TICKET_PROBLEM],
    ['a ticket as a number', { ...NEW_WALK_IN, ticket: 1234 }, TICKET_PROBLEM],
    ['a missing work', { ...NEW_WALK_IN, work: undefined }, WORK_PROBLEM],
    ['a blank work', { ...NEW_WALK_IN, work: '   ' }, WORK_PROBLEM],
    ['a negative price', { ...NEW_WALK_IN, finalPriceMxn: -1 }, PRICE_PROBLEM],
    ['a fractional price', { ...NEW_WALK_IN, finalPriceMxn: 9.5 }, PRICE_PROBLEM],
    ['a price as text', { ...NEW_WALK_IN, finalPriceMxn: '250' }, PRICE_PROBLEM],
    ['a missing delivery date', { ...NEW_WALK_IN, deliveryDate: undefined }, DATE_PROBLEM],
    ['a delivery date in another format', { ...NEW_WALK_IN, deliveryDate: '22/05/2026' }, DATE_PROBLEM],
    ['a delivery date that does not exist', { ...NEW_WALK_IN, deliveryDate: '2026-02-30' }, DATE_PROBLEM],
    ['an unknown status', { ...NEW_WALK_IN, status: 'lost' }, STATUS_PROBLEM],
    ['a missing status', { ...NEW_WALK_IN, status: undefined }, STATUS_PROBLEM],
    ['a walk-in without a name', { ...NEW_WALK_IN, clientName: undefined }, NAME_PROBLEM],
    ['a walk-in with a blank name', { ...NEW_WALK_IN, clientName: '  ' }, NAME_PROBLEM],
    ['a 9-digit phone', { ...NEW_WALK_IN, whatsapp: '998000111' }, WHATSAPP_PROBLEM],
    ['a phone with spaces', { ...NEW_WALK_IN, whatsapp: '998 000 1111' }, WHATSAPP_PROBLEM],
    ['an appointment without a time', { ...NEW_FROM_APPOINTMENT, appointment: { date: '2026-05-15' } }, APPOINTMENT_PROBLEM],
    ['an appointment time with seconds', { ...NEW_FROM_APPOINTMENT, appointment: { date: '2026-05-15', time: '12:00:00' } }, APPOINTMENT_PROBLEM],
    ['an appointment as text', { ...NEW_FROM_APPOINTMENT, appointment: '2026-05-15 12:00' }, APPOINTMENT_PROBLEM],
  ])('answers 400 for %s and adds nothing', async (_case, body, problem) => {
    const { app, orders } = ordersApp()

    const response = await request(app).post('/api/orders').set(asAdmin()).send(body)

    expect(response.status).toBe(400)
    expect(response.body).toEqual(problem)
    expect(await orders.all()).toEqual(ALL_ORDERS_BY_DATE)
  })

  it('answers 400 for an empty body', async () => {
    const response = await request(ordersApp().app).post('/api/orders').set(asAdmin())

    expect(response.status).toBe(400)
    expect(response.body).toEqual(TICKET_PROBLEM)
  })

  it('answers 404 when no appointment is at that date and time, and adds nothing', async () => {
    const { app, orders } = ordersApp()

    const response = await request(app)
      .post('/api/orders')
      .set(asAdmin())
      .send({ ...NEW_FROM_APPOINTMENT, appointment: { date: '2026-05-15', time: '13:00' } })

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'No hay una cita en esa fecha y hora.', code: 'not_found' })
    expect(await orders.all()).toEqual(ALL_ORDERS_BY_DATE)
  })

  it('answers 409 when an active order holds the ticket, and adds nothing', async () => {
    const { app, orders } = ordersApp()

    const response = await request(app)
      .post('/api/orders')
      .set(asAdmin())
      .send({ ...NEW_WALK_IN, ticket: ROSA_ZIPPER.ticket })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'Ya hay un pedido activo con ese folio.', code: 'ticket_taken' })
    expect(await orders.all()).toEqual(ALL_ORDERS_BY_DATE)
  })

  it('answers 409 when the appointment already has an order, and adds nothing', async () => {
    const { app, orders } = ordersApp()

    const response = await request(app)
      .post('/api/orders')
      .set(asAdmin())
      .send({ ...NEW_FROM_APPOINTMENT, appointment: ANA_HEM.appointment })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'Esta cita ya tiene un pedido.', code: 'appointment_has_order' })
    expect(await orders.all()).toEqual(ALL_ORDERS_BY_DATE)
  })
})

describe('PUT /api/orders/:ticket', () => {
  it('changes the active order with that ticket and answers 200 with it', async () => {
    const { app, orders } = ordersApp()

    const response = await request(app).put('/api/orders/1290').set(asAdmin()).send(CHANGES)

    const updated = { ...ROSA_ZIPPER, ...CHANGES }
    expect(response.status).toBe(200)
    expect(response.body).toEqual(updated)
    expect(await orders.all()).toEqual([OLD_DELIVERED, CANCELLED, ANA_HEM, updated])
  })

  it('ignores a ticket, client or appointment in the body', async () => {
    const response = await request(ordersApp().app)
      .put('/api/orders/0427')
      .set(asAdmin())
      .send({ ...CHANGES, ticket: '9999', clientName: 'Otra', appointment: undefined })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ...ANA_HEM, ...CHANGES })
  })

  it('answers 404 when only a finished order holds the ticket, and changes nothing', async () => {
    const { app, orders } = ordersApp()

    const response = await request(app).put('/api/orders/7777').set(asAdmin()).send(CHANGES)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'No hay un pedido activo con ese folio.', code: 'not_found' })
    expect(await orders.all()).toEqual(ALL_ORDERS_BY_DATE)
  })

  it('answers 404 for a ticket no order holds', async () => {
    const response = await request(ordersApp().app).put('/api/orders/4040').set(asAdmin()).send(CHANGES)

    expect(response.status).toBe(404)
    expect(response.body.code).toBe('not_found')
  })

  it.each(['123', '12345', 'abcd'])('answers 400 for the ticket %s', async (ticket) => {
    const response = await request(ordersApp().app).put(`/api/orders/${ticket}`).set(asAdmin()).send(CHANGES)

    expect(response.status).toBe(400)
    expect(response.body).toEqual(TICKET_PROBLEM)
  })

  it.each([
    ['a blank work', { ...CHANGES, work: '' }, WORK_PROBLEM],
    ['a negative price', { ...CHANGES, finalPriceMxn: -5 }, PRICE_PROBLEM],
    ['a bad delivery date', { ...CHANGES, deliveryDate: '2026-13-01' }, DATE_PROBLEM],
    ['an unknown status', { ...CHANGES, status: 'Listo' }, STATUS_PROBLEM],
  ])('answers 400 for %s and changes nothing', async (_case, body, problem) => {
    const { app, orders } = ordersApp()

    const response = await request(app).put('/api/orders/1290').set(asAdmin()).send(body)

    expect(response.status).toBe(400)
    expect(response.body).toEqual(problem)
    expect(await orders.all()).toEqual(ALL_ORDERS_BY_DATE)
  })
})
