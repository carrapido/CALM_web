// @vitest-environment node
import { argon2Verify } from 'hash-wasm'
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { hashNip } from '../src/utils/nip.js'
import { InMemoryClientRepository, type StoredClient } from './in-memory-client-repository.js'
import { asAdmin, asClient, CLIENT_TOKEN, RecordingAuthAccounts, testApp } from './test-app.js'

// Rosa already signs in to the app; Lucía came to the counter and has no NIP yet.
const ROSA: StoredClient = {
  id: '1', name: 'Rosa Méndez', phone: '9981234567', hasAppAccess: true, nipHash: 'hash-de-rosa', userId: 'rosa-user',
}
const LUCIA: StoredClient = {
  id: '2', name: 'Lucía Pérez', phone: '9987654321', hasAppAccess: false, nipHash: null, userId: null,
}
const PUBLIC_ROSA = { id: '1', name: 'Rosa Méndez', phone: '9981234567', hasAppAccess: true }
const PUBLIC_LUCIA = { id: '2', name: 'Lucía Pérez', phone: '9987654321', hasAppAccess: false }

const NAME_PROBLEM = { error: 'Escribe el nombre del cliente.', code: 'name' }
const PHONE_PROBLEM = { error: 'Escribe el celular a 10 dígitos.', code: 'phone' }
const NIP_PROBLEM = { error: 'El NIP necesita 4 dígitos.', code: 'nip' }
const PHONE_TAKEN = { error: 'Ese celular ya es de otro cliente.', code: 'phone_taken' }
const NOT_FOUND = { error: 'Ese cliente ya no existe.', code: 'not_found' }
const ID_PROBLEM = { error: 'El identificador del cliente no es válido.', code: 'invalid_input' }

const NEW_MARTA = { name: 'Marta Gil', phone: '9985551234', nip: '4321' }

const ROSA_HISTORY = { appointments: 2, orders: 1 }
const LUCIA_HISTORY = { appointments: 1, orders: 0 }

function clientsApp(authAccounts = new RecordingAuthAccounts()) {
  const clients = new InMemoryClientRepository([ROSA, LUCIA], { 1: ROSA_HISTORY, 2: LUCIA_HISTORY })
  return { app: testApp({ clients, authAccounts }), clients, authAccounts }
}

// Supabase Auth refusing to delete her user.
class FailingDeleteAuthAccounts extends RecordingAuthAccounts {
  async deleteUser(userId: string): Promise<void> {
    await super.deleteUser(userId)
    throw new Error('Supabase Auth is down')
  }
}

describe('hashNip', () => {
  it('hashes with argon2id and the parameters the mobile sign-in verifies with', async () => {
    const hash = await hashNip('4321')

    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/)
    expect(await argon2Verify({ password: '4321', hash })).toBe(true)
    expect(await argon2Verify({ password: '1234', hash })).toBe(false)
  })

  it('salts every hash differently', async () => {
    expect(await hashNip('4321')).not.toBe(await hashNip('4321'))
  })
})

describe('GET /api/clients', () => {
  it('lists every client and her access, never her NIP hash', async () => {
    const response = await request(clientsApp().app).get('/api/clients').set(asAdmin())

    expect(response.status).toBe(200)
    expect(response.body).toEqual([PUBLIC_ROSA, PUBLIC_LUCIA])
  })

  it('answers 401 without a session and 403 to a non-admin', async () => {
    const { app } = clientsApp()

    const anonymous = await request(app).get('/api/clients')
    const client = await request(app).get('/api/clients').set({ Authorization: `Bearer ${CLIENT_TOKEN}` })

    expect(anonymous.status).toBe(401)
    expect(client.status).toBe(403)
    expect(client.body.code).toBe('not_admin')
  })
})

describe('POST /api/clients', () => {
  it('adds the client with app access and answers 201 with her', async () => {
    const { app, clients } = clientsApp()

    const response = await request(app).post('/api/clients').set(asAdmin()).send(NEW_MARTA)

    const marta = { id: '100', name: 'Marta Gil', phone: '9985551234', hasAppAccess: true }
    expect(response.status).toBe(201)
    expect(response.body).toEqual({ client: marta })
    expect(await clients.all()).toEqual([PUBLIC_ROSA, PUBLIC_LUCIA, marta])
  })

  it('stores a hash of the NIP, never the NIP itself', async () => {
    const { app, clients } = clientsApp()

    await request(app).post('/api/clients').set(asAdmin()).send(NEW_MARTA)

    const nipHash = clients.storedClient('100')?.nipHash ?? ''
    expect(nipHash).not.toContain('4321')
    expect(await argon2Verify({ password: '4321', hash: nipHash })).toBe(true)
  })

  it('trims the name and keeps only the digits of the phone and NIP', async () => {
    const response = await request(clientsApp().app)
      .post('/api/clients')
      .set(asAdmin())
      .send({ name: '  Marta Gil  ', phone: '998 555-1234', nip: '43 21' })

    expect(response.status).toBe(201)
    expect(response.body.client).toEqual({ id: '100', name: 'Marta Gil', phone: '9985551234', hasAppAccess: true })
  })

  it.each([
    ['a 9-digit phone', { ...NEW_MARTA, phone: '998555123' }, PHONE_PROBLEM],
    ['an 11-digit phone', { ...NEW_MARTA, phone: '99855512345' }, PHONE_PROBLEM],
    ['a phone that is not text', { ...NEW_MARTA, phone: 9985551234 }, PHONE_PROBLEM],
    ['a missing phone', { ...NEW_MARTA, phone: undefined }, PHONE_PROBLEM],
    ['a 3-digit NIP', { ...NEW_MARTA, nip: '432' }, NIP_PROBLEM],
    ['a 5-digit NIP', { ...NEW_MARTA, nip: '43210' }, NIP_PROBLEM],
    ['a NIP that is not text', { ...NEW_MARTA, nip: 4321 }, NIP_PROBLEM],
    ['a missing name', { ...NEW_MARTA, name: undefined }, NAME_PROBLEM],
    ['a blank name', { ...NEW_MARTA, name: '   ' }, NAME_PROBLEM],
    ['an 81-character name', { ...NEW_MARTA, name: 'a'.repeat(81) }, NAME_PROBLEM],
    ['a bad phone, NIP and name, naming the phone first', { name: '', phone: '1', nip: '1' }, PHONE_PROBLEM],
    ['a bad NIP and name, naming the NIP first', { ...NEW_MARTA, name: '', nip: '1' }, NIP_PROBLEM],
  ])('answers 400 for %s and adds nothing', async (_case, body, problem) => {
    const { app, clients } = clientsApp()

    const response = await request(app).post('/api/clients').set(asAdmin()).send(body)

    expect(response.status).toBe(400)
    expect(response.body).toEqual(problem)
    expect(await clients.all()).toEqual([PUBLIC_ROSA, PUBLIC_LUCIA])
  })

  it('accepts an 80-character name', async () => {
    const response = await request(clientsApp().app)
      .post('/api/clients')
      .set(asAdmin())
      .send({ ...NEW_MARTA, name: 'a'.repeat(80) })

    expect(response.status).toBe(201)
  })

  it('answers 400 for an empty body', async () => {
    const response = await request(clientsApp().app).post('/api/clients').set(asAdmin())

    expect(response.status).toBe(400)
    expect(response.body).toEqual(PHONE_PROBLEM)
  })

  it('answers 409 when another client has the phone', async () => {
    const { app, clients } = clientsApp()

    const response = await request(app).post('/api/clients').set(asAdmin()).send({ ...NEW_MARTA, phone: ROSA.phone })

    expect(response.status).toBe(409)
    expect(response.body).toEqual(PHONE_TAKEN)
    expect(await clients.all()).toEqual([PUBLIC_ROSA, PUBLIC_LUCIA])
  })
})

describe('PUT /api/clients/:id/access', () => {
  it('gives an existing client a NIP and answers 200 with her', async () => {
    const { app, clients, authAccounts } = clientsApp()

    const response = await request(app).put('/api/clients/2/access').set(asAdmin()).send({ phone: LUCIA.phone, nip: '1111' })

    const lucia = { ...PUBLIC_LUCIA, hasAppAccess: true }
    expect(response.status).toBe(200)
    expect(response.body).toEqual({ client: lucia })
    expect(await clients.all()).toEqual([PUBLIC_ROSA, lucia])
    expect(await argon2Verify({ password: '1111', hash: clients.storedClient('2')?.nipHash ?? '' })).toBe(true)
    expect(authAccounts.emailChanges).toEqual([])
  })

  it('keeps her name even when the body brings another one', async () => {
    const response = await request(clientsApp().app)
      .put('/api/clients/2/access')
      .set(asAdmin())
      .send({ name: 'Otra', phone: '9980001111', nip: '1111' })

    expect(response.body.client).toEqual({ ...PUBLIC_LUCIA, phone: '9980001111', hasAppAccess: true })
  })

  it('renames the auth email of an app user whose phone changes', async () => {
    const { app, authAccounts } = clientsApp()

    const response = await request(app).put('/api/clients/1/access').set(asAdmin()).send({ phone: '9980001111', nip: '2222' })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ client: { ...PUBLIC_ROSA, phone: '9980001111' } })
    expect(authAccounts.emailChanges).toEqual([{ userId: 'rosa-user', email: '9980001111@clients.calm.app' }])
  })

  it('leaves the auth email alone when an app user keeps her phone', async () => {
    const { app, authAccounts } = clientsApp()

    const response = await request(app).put('/api/clients/1/access').set(asAdmin()).send({ phone: ROSA.phone, nip: '2222' })

    expect(response.status).toBe(200)
    expect(authAccounts.emailChanges).toEqual([])
  })

  it.each([
    ['a 9-digit phone', { phone: '998000111', nip: '1111' }, PHONE_PROBLEM],
    ['a 3-digit NIP', { phone: '9980001111', nip: '111' }, NIP_PROBLEM],
  ])('answers 400 for %s and changes nothing', async (_case, body, problem) => {
    const { app, clients } = clientsApp()

    const response = await request(app).put('/api/clients/2/access').set(asAdmin()).send(body)

    expect(response.status).toBe(400)
    expect(response.body).toEqual(problem)
    expect(await clients.all()).toEqual([PUBLIC_ROSA, PUBLIC_LUCIA])
  })

  it.each(['abc', '0', '-1', '1.5'])('answers 400 for the id %s', async (id) => {
    const response = await request(clientsApp().app)
      .put(`/api/clients/${id}/access`)
      .set(asAdmin())
      .send({ phone: '9980001111', nip: '1111' })

    expect(response.status).toBe(400)
    expect(response.body).toEqual(ID_PROBLEM)
  })

  it('answers 404 for a client that does not exist', async () => {
    const response = await request(clientsApp().app)
      .put('/api/clients/99/access')
      .set(asAdmin())
      .send({ phone: '9980001111', nip: '1111' })

    expect(response.status).toBe(404)
    expect(response.body).toEqual(NOT_FOUND)
  })

  it('answers 409 when another client has the phone, and renames nothing', async () => {
    const { app, clients, authAccounts } = clientsApp()

    const response = await request(app).put('/api/clients/1/access').set(asAdmin()).send({ phone: LUCIA.phone, nip: '2222' })

    expect(response.status).toBe(409)
    expect(response.body).toEqual(PHONE_TAKEN)
    expect(await clients.all()).toEqual([PUBLIC_ROSA, PUBLIC_LUCIA])
    expect(authAccounts.emailChanges).toEqual([])
  })
})

describe('GET /api/clients/:id/history', () => {
  it('answers how many appointments and orders she has', async () => {
    const response = await request(clientsApp().app).get('/api/clients/1/history').set(asAdmin())

    expect(response.status).toBe(200)
    expect(response.body).toEqual(ROSA_HISTORY)
  })

  it.each(['abc', '0', '-1', '1.5'])('answers 400 for the id %s', async (id) => {
    const response = await request(clientsApp().app).get(`/api/clients/${id}/history`).set(asAdmin())

    expect(response.status).toBe(400)
    expect(response.body).toEqual(ID_PROBLEM)
  })

  it('answers 404 for a client that does not exist', async () => {
    const response = await request(clientsApp().app).get('/api/clients/99/history').set(asAdmin())

    expect(response.status).toBe(404)
    expect(response.body).toEqual(NOT_FOUND)
  })

  it('answers 401 without a session and 403 to a non-admin', async () => {
    const { app } = clientsApp()

    const anonymous = await request(app).get('/api/clients/1/history')
    const client = await request(app).get('/api/clients/1/history').set(asClient())

    expect(anonymous.status).toBe(401)
    expect(client.status).toBe(403)
    expect(client.body.code).toBe('not_admin')
  })
})

describe('DELETE /api/clients/:id', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('deletes her with her history and her auth user, answers 204, and leaves the others', async () => {
    const { app, authAccounts } = clientsApp()

    const response = await request(app).delete('/api/clients/1').set(asAdmin())

    expect(response.status).toBe(204)
    expect(response.text).toBe('')
    expect((await request(app).get('/api/clients').set(asAdmin())).body).toEqual([PUBLIC_LUCIA])
    expect((await request(app).get('/api/clients/1/history').set(asAdmin())).status).toBe(404)
    expect((await request(app).get('/api/clients/2/history').set(asAdmin())).body).toEqual(LUCIA_HISTORY)
    expect(authAccounts.deletedUsers).toEqual(['rosa-user'])
  })

  it('deletes a client who never signed in to the app without touching Supabase Auth', async () => {
    const { app, clients, authAccounts } = clientsApp()

    const response = await request(app).delete('/api/clients/2').set(asAdmin())

    expect(response.status).toBe(204)
    expect(await clients.all()).toEqual([PUBLIC_ROSA])
    expect(authAccounts.deletedUsers).toEqual([])
  })

  it('keeps her and answers 500 when Supabase Auth cannot delete her user, so a retry can finish', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { app, clients, authAccounts } = clientsApp(new FailingDeleteAuthAccounts())

    const response = await request(app).delete('/api/clients/1').set(asAdmin())

    expect(response.status).toBe(500)
    expect(response.body.code).toBe('unavailable')
    expect(await clients.all()).toEqual([PUBLIC_ROSA, PUBLIC_LUCIA])
    expect(await clients.history('1')).toEqual(ROSA_HISTORY)
    expect(authAccounts.deletedUsers).toEqual(['rosa-user'])
  })

  it('answers 404 for a client that does not exist and deletes nothing', async () => {
    const { app, clients, authAccounts } = clientsApp()

    const response = await request(app).delete('/api/clients/99').set(asAdmin())

    expect(response.status).toBe(404)
    expect(response.body).toEqual(NOT_FOUND)
    expect(await clients.all()).toEqual([PUBLIC_ROSA, PUBLIC_LUCIA])
    expect(authAccounts.deletedUsers).toEqual([])
  })

  it.each(['abc', '0', '-1', '1.5'])('answers 400 for the id %s and deletes nothing', async (id) => {
    const { app, clients } = clientsApp()

    const response = await request(app).delete(`/api/clients/${id}`).set(asAdmin())

    expect(response.status).toBe(400)
    expect(response.body).toEqual(ID_PROBLEM)
    expect(await clients.all()).toEqual([PUBLIC_ROSA, PUBLIC_LUCIA])
  })

  it('answers 401 without a session and 403 to a non-admin, and deletes nothing', async () => {
    const { app, clients, authAccounts } = clientsApp()

    const anonymous = await request(app).delete('/api/clients/1')
    const client = await request(app).delete('/api/clients/1').set(asClient())

    expect(anonymous.status).toBe(401)
    expect(client.status).toBe(403)
    expect(client.body.code).toBe('not_admin')
    expect(await clients.all()).toEqual([PUBLIC_ROSA, PUBLIC_LUCIA])
    expect(authAccounts.deletedUsers).toEqual([])
  })
})
