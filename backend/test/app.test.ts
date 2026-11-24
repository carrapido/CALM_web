// @vitest-environment node
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ServiceRepository } from '../src/types/service.js'
import { InMemoryServiceRepository } from './in-memory-service-repository.js'
import { postgresError } from './postgres-error.js'
import { ADMIN_TOKEN, ALLOWED_ORIGIN, CLIENT_TOKEN, asAdmin, testApp } from './test-app.js'

const UNAVAILABLE = {
  error: 'No pudimos completar la operación. Inténtalo de nuevo.',
  code: 'unavailable',
}

afterEach(() => {
  vi.restoreAllMocks()
})

// A repository whose every read fails with `error`, to reach the error middleware.
function failingServices(error: unknown): ServiceRepository {
  const services = new InMemoryServiceRepository()
  services.all = async () => {
    throw error
  }
  return services
}

describe('GET /api/health', () => {
  it('answers 200 without a token', async () => {
    const response = await request(testApp()).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok' })
  })

  it('lets only the panel origin read the answer', async () => {
    const allowed = await request(testApp()).get('/api/health').set('Origin', ALLOWED_ORIGIN)
    const other = await request(testApp()).get('/api/health').set('Origin', 'https://evil.example')

    expect(allowed.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN)
    expect(other.headers['access-control-allow-origin']).not.toBe('https://evil.example')
  })
})

describe('The admin guard on /api', () => {
  it('answers 401 without a token', async () => {
    const response = await request(testApp()).get('/api/services')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Inicia sesión para continuar.', code: 'unauthenticated' })
  })

  it('answers 401 for a token Supabase Auth rejects', async () => {
    const response = await request(testApp())
      .get('/api/services')
      .set('Authorization', 'Bearer token-vencido')

    expect(response.status).toBe(401)
    expect(response.body).toEqual({ error: 'Inicia sesión para continuar.', code: 'unauthenticated' })
  })

  it('answers 401 when the header is not a Bearer token', async () => {
    const response = await request(testApp())
      .get('/api/services')
      .set('Authorization', `Basic ${ADMIN_TOKEN}`)

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('unauthenticated')
  })

  it('answers 403 for a signed-in user who is not an admin', async () => {
    const response = await request(testApp())
      .get('/api/services')
      .set('Authorization', `Bearer ${CLIENT_TOKEN}`)

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: 'Esta cuenta no tiene acceso al panel de administración.',
      code: 'not_admin',
    })
  })

  it('lets an admin through', async () => {
    const response = await request(testApp()).get('/api/services').set(asAdmin())

    expect(response.status).toBe(200)
  })
})

describe('Unknown routes', () => {
  it('answers 404 under /api for an admin', async () => {
    const response = await request(testApp()).get('/api/no-existe').set(asAdmin())

    expect(response.status).toBe(404)
    expect(response.body).toEqual({ error: 'No existe la ruta GET /api/no-existe.', code: 'not_found' })
  })

  it('answers 404 outside /api', async () => {
    const response = await request(testApp()).get('/no-existe')

    expect(response.status).toBe(404)
    expect(response.body.code).toBe('not_found')
  })
})

describe('The error middleware', () => {
  it('answers 500 without the details and logs them', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failure = new Error('password authentication failed for user "postgres"')

    const response = await request(testApp({ services: failingServices(failure) })).get('/api/services').set(asAdmin())

    expect(response.status).toBe(500)
    expect(response.body).toEqual(UNAVAILABLE)
    expect(log).toHaveBeenCalledWith(failure)
  })

  it('answers 409 when Postgres reports a duplicate (23505)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const services = failingServices(postgresError('23505', 'duplicate key value violates "x_key"'))

    const response = await request(testApp({ services })).get('/api/services').set(asAdmin())

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'Ya existe un registro con esos datos.', code: 'conflict' })
  })

  it('answers 409 when Postgres reports a row still in use (23503)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const services = failingServices(postgresError('23503'))

    const response = await request(testApp({ services })).get('/api/services').set(asAdmin())

    expect(response.status).toBe(409)
    expect(response.body).toEqual({
      error: 'El registro está relacionado con otros datos y no se puede cambiar así.',
      code: 'conflict',
    })
  })

  it.each([
    ['23505', 'services_name_key', { error: 'Ya existe un servicio con ese nombre.', code: 'service_name_taken' }],
    ['23505', 'clients_phone_key', { error: 'Ese celular ya es de otro cliente.', code: 'phone_taken' }],
    ['23505', 'orders_active_ticket_key', { error: 'Ya hay un pedido activo con ese folio.', code: 'ticket_taken' }],
    ['23505', 'orders_appointment_id_key', { error: 'Esta cita ya tiene un pedido.', code: 'appointment_has_order' }],
    [
      '23503',
      'orders_appointment_id_fkey',
      { error: 'Esta cita ya tiene un pedido; cancela o entrega el pedido primero.', code: 'appointment_has_order' },
    ],
  ])('answers 409 with its own message when Postgres %s names %s', async (code, constraint, body) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const services = failingServices(postgresError(code, 'database refused the statement', constraint))

    const response = await request(testApp({ services })).get('/api/services').set(asAdmin())

    expect(response.status).toBe(409)
    expect(response.body).toEqual(body)
  })

  it('keeps the general 409 for a constraint it does not know', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const services = failingServices(postgresError('23505', 'duplicate key', 'some_other_key'))

    const response = await request(testApp({ services })).get('/api/services').set(asAdmin())

    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: 'Ya existe un registro con esos datos.', code: 'conflict' })
  })

  it('answers 400 when Postgres rejects a value (22P02)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const services = failingServices(postgresError('22P02'))

    const response = await request(testApp({ services })).get('/api/services').set(asAdmin())

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Los datos enviados no son válidos.', code: 'invalid_input' })
  })

  it('answers 400 for a body that is not JSON', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await request(testApp())
      .post('/api/services')
      .set(asAdmin())
      .set('Content-Type', 'application/json')
      .send('{"name": ')

    expect(response.status).toBe(400)
    expect(response.body).toEqual({ error: 'Los datos enviados no son válidos.', code: 'invalid_input' })
  })
})

describe('The admin guard failures', () => {
  it.each(['bearer x', 'Bearer  x', 'Bearer ', 'Bearer x y'])(
    'answers 401 for %j without asking Supabase',
    async (header) => {
      const seen: string[] = []
      const app = testApp({
        services: new InMemoryServiceRepository(),
        identity: {
          userIdForToken: async (token) => {
            seen.push(token)
            return 'admin-user-id'
          },
        },
        admins: { isAdmin: async () => true },
      })

      const response = await request(app).get('/api/services').set('Authorization', header)

      expect(response.status).toBe(401)
      expect(seen).toEqual([])
    },
  )

  it('answers 500 and touches nothing when Supabase Auth fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const services = new InMemoryServiceRepository()
    const all = vi.spyOn(services, 'all')
    const app = testApp({
      services,
      identity: {
        userIdForToken: async () => {
          throw new Error('down')
        },
      },
      admins: { isAdmin: async () => true },
    })

    const response = await request(app).get('/api/services').set(asAdmin())

    expect(response.status).toBe(500)
    expect(response.body).toEqual(UNAVAILABLE)
    expect(all).not.toHaveBeenCalled()
  })

  it('answers 500 when the admins lookup fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = testApp({
      services: new InMemoryServiceRepository(),
      identity: { userIdForToken: async () => 'admin-user-id' },
      admins: {
        isAdmin: async () => {
          throw postgresError('57P01')
        },
      },
    })

    expect((await request(app).get('/api/services').set(asAdmin())).status).toBe(500)
  })

  it.each(['/API/services', '/api//services', '/api/x', '/api'])(
    'answers 401 for %s without a token',
    async (path) => {
      expect((await request(testApp()).get(path)).status).toBe(401)
    },
  )

  it('answers 403 to a non-admin on every method', async () => {
    const client = { Authorization: `Bearer ${CLIENT_TOKEN}` }
    expect((await request(testApp()).post('/api/services').set(client).send({})).status).toBe(403)
    expect((await request(testApp()).put('/api/services/3').set(client).send({})).status).toBe(403)
    expect((await request(testApp()).delete('/api/services/3').set(client)).status).toBe(403)
  })
})

describe('Bodies the API cannot take', () => {
  it('answers 413 to a body over the limit', async () => {
    const response = await request(testApp())
      .post('/api/services')
      .set(asAdmin())
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ name: 'x'.repeat(200_000) }))

    expect(response.status).toBe(413)
    expect(response.body.code).toBe('body_too_large')
  })

  it('answers 415 to a charset it does not read', async () => {
    const response = await request(testApp())
      .post('/api/services')
      .set(asAdmin())
      .set('Content-Type', 'application/json; charset=latin9')
      .send('{}')

    expect(response.status).toBe(415)
    expect(response.body.code).toBe('unsupported_body')
  })
})
