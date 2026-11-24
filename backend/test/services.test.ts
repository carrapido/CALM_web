// @vitest-environment node
import request from 'supertest'
import { describe, expect, it } from 'vitest'
import type { Service } from '../src/types/service.js'
import { InMemoryServiceRepository } from './in-memory-service-repository.js'
import { asAdmin, testApp } from './test-app.js'

const PATCH: Service = {
  id: '3',
  name: 'Parche',
  price: { kind: 'base', amountMxn: 40 },
  estimatedDays: 0,
  isActive: true,
}
const WEDDING_DRESS: Service = {
  id: '6',
  name: 'Arreglo de vestido de novia',
  price: { kind: 'inStore' },
  estimatedDays: 15,
  isActive: false,
}
const NAME_PROBLEM = 'El nombre es obligatorio y tiene hasta 80 caracteres.'
const PRICE_PROBLEM = 'El precio es un entero de 0 o más, o se cotiza en tienda.'
const DAYS_PROBLEM = 'Los días estimados son un entero de 0 a 30.'
const ID_PROBLEM = 'El identificador del servicio no es válido.'

const NEW_HEM = { name: 'Dobladillo', price: { kind: 'base', amountMxn: 80 }, estimatedDays: 2 }

// The catalog with Parche and the wedding dress, the second still used by an appointment.
function catalogApp() {
  const services = new InMemoryServiceRepository([PATCH, WEDDING_DRESS], [WEDDING_DRESS.id])
  return { app: testApp({ services }), services }
}

describe('GET /api/services', () => {
  it('lists every service with its price, days and state', async () => {
    const response = await request(catalogApp().app).get('/api/services').set(asAdmin())

    expect(response.status).toBe(200)
    expect(response.body).toEqual([PATCH, WEDDING_DRESS])
  })
})

describe('POST /api/services', () => {
  it('adds an active service and answers 201 with it', async () => {
    const { app, services } = catalogApp()

    const response = await request(app).post('/api/services').set(asAdmin()).send(NEW_HEM)

    const added = { ...NEW_HEM, id: '100', isActive: true }
    expect(response.status).toBe(201)
    expect(response.body).toEqual(added)
    expect(await services.all()).toEqual([PATCH, WEDDING_DRESS, added])
  })

  it('stores the name without surrounding spaces and accepts an in-store price', async () => {
    const response = await request(catalogApp().app)
      .post('/api/services')
      .set(asAdmin())
      .send({ name: '  Cierre  ', price: { kind: 'inStore' }, estimatedDays: 30 })

    expect(response.status).toBe(201)
    expect(response.body).toEqual({
      id: '100',
      name: 'Cierre',
      price: { kind: 'inStore' },
      estimatedDays: 30,
      isActive: true,
    })
  })

  it.each([
    ['a missing name', { ...NEW_HEM, name: undefined }, NAME_PROBLEM],
    ['a blank name', { ...NEW_HEM, name: '   ' }, NAME_PROBLEM],
    ['an 81-character name', { ...NEW_HEM, name: 'a'.repeat(81) }, NAME_PROBLEM],
    ['a name that is not text', { ...NEW_HEM, name: 42 }, NAME_PROBLEM],
    ['a missing price', { ...NEW_HEM, price: undefined }, PRICE_PROBLEM],
    ['a negative price', { ...NEW_HEM, price: { kind: 'base', amountMxn: -1 } }, PRICE_PROBLEM],
    ['a fractional price', { ...NEW_HEM, price: { kind: 'base', amountMxn: 9.5 } }, PRICE_PROBLEM],
    ['a price as text', { ...NEW_HEM, price: { kind: 'base', amountMxn: '80' } }, PRICE_PROBLEM],
    ['an unknown price kind', { ...NEW_HEM, price: { kind: 'gratis' } }, PRICE_PROBLEM],
    ['31 estimated days', { ...NEW_HEM, estimatedDays: 31 }, DAYS_PROBLEM],
    ['negative estimated days', { ...NEW_HEM, estimatedDays: -1 }, DAYS_PROBLEM],
    ['fractional estimated days', { ...NEW_HEM, estimatedDays: 1.5 }, DAYS_PROBLEM],
  ])('answers 400 for %s and adds nothing', async (_case, body, message) => {
    const { app, services } = catalogApp()

    const response = await request(app).post('/api/services').set(asAdmin()).send(body)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: message, code: 'invalid_input' })
    expect(await services.all()).toEqual([PATCH, WEDDING_DRESS])
  })

  it('answers 400 for an empty body', async () => {
    const response = await request(catalogApp().app).post('/api/services').set(asAdmin())

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('invalid_input')
  })

  it('answers 409 when the name is taken', async () => {
    const { app, services } = catalogApp()

    const response = await request(app)
      .post('/api/services')
      .set(asAdmin())
      .send({ ...NEW_HEM, name: 'Parche' })

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'Ya existe un registro con esos datos.', code: 'conflict' })
    expect(await services.all()).toEqual([PATCH, WEDDING_DRESS])
  })
})

describe('PUT /api/services/:id', () => {
  const NEW_PATCH = { name: 'Parche grande', price: { kind: 'base', amountMxn: 60 }, estimatedDays: 1, isActive: false }

  it('replaces the service and answers 200 with it', async () => {
    const { app, services } = catalogApp()

    const response = await request(app).put('/api/services/3').set(asAdmin()).send(NEW_PATCH)

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ ...NEW_PATCH, id: '3' })
    expect(await services.all()).toEqual([{ ...NEW_PATCH, id: '3' }, WEDDING_DRESS])
  })

  it.each([
    ['a missing isActive', { ...NEW_PATCH, isActive: undefined }],
    ['an isActive as text', { ...NEW_PATCH, isActive: 'false' }],
  ])('answers 400 for %s and changes nothing', async (_case, body) => {
    const { app, services } = catalogApp()

    const response = await request(app).put('/api/services/3').set(asAdmin()).send(body)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: 'Indica si el servicio está activo con true o false.',
      code: 'invalid_input',
    })
    expect(await services.all()).toEqual([PATCH, WEDDING_DRESS])
  })

  it('validates the fields as POST does', async () => {
    const response = await request(catalogApp().app)
      .put('/api/services/3')
      .set(asAdmin())
      .send({ ...NEW_PATCH, estimatedDays: 31 })

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: DAYS_PROBLEM, code: 'invalid_input' })
  })

  it.each(['abc', '0', '-1', '1.5'])('answers 400 for the id %s', async (id) => {
    const response = await request(catalogApp().app).put(`/api/services/${id}`).set(asAdmin()).send(NEW_PATCH)

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: ID_PROBLEM, code: 'invalid_input' })
  })

  it('answers 404 for a service that does not exist', async () => {
    const response = await request(catalogApp().app).put('/api/services/99').set(asAdmin()).send(NEW_PATCH)

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'El servicio no existe.', code: 'not_found' })
  })

  it('answers 409 when the new name belongs to another service', async () => {
    const response = await request(catalogApp().app)
      .put('/api/services/3')
      .set(asAdmin())
      .send({ ...NEW_PATCH, name: WEDDING_DRESS.name })

    expect(response.status).toBe(409)
    expect(response.body.code).toBe('conflict')
  })
})

describe('DELETE /api/services/:id', () => {
  it('deletes the service and answers 204', async () => {
    const { app, services } = catalogApp()

    const response = await request(app).delete('/api/services/3').set(asAdmin())

    expect(response.status).toBe(204)
    expect(response.text).toBe('')
    expect(await services.all()).toEqual([WEDDING_DRESS])
  })

  it('answers 409 and keeps a service an appointment uses', async () => {
    const { app, services } = catalogApp()

    const response = await request(app).delete('/api/services/6').set(asAdmin())

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: 'No se puede eliminar porque hay citas que usan este servicio. Desactívalo para ocultarlo a los clientes.',
      code: 'service_in_use',
    })
    expect(await services.all()).toEqual([PATCH, WEDDING_DRESS])
  })

  it('answers 404 for a service that does not exist', async () => {
    const response = await request(catalogApp().app).delete('/api/services/99').set(asAdmin())

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'El servicio no existe.', code: 'not_found' })
  })

  it('answers 400 for an id that is not a positive integer', async () => {
    const response = await request(catalogApp().app).delete('/api/services/abc').set(asAdmin())

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: ID_PROBLEM, code: 'invalid_input' })
  })
})
