import { describe, expect, it } from 'vitest'
import { ApiClient, ApiError } from '../services/api-client'
import { ApiClientsRepository } from '../services/api-clients-repository'
import type { Client } from '../types/client'

type SentRequest = { url: string; method: string; headers: Headers; body: unknown }

const ROSA: Client = { id: '7', name: 'Rosa Méndez', phone: '9981234567', hasAppAccess: true }
const NEW_CLIENT = { kind: 'new', name: 'Marta Gil', phone: '9985551234', nip: '4321' } as const
const EXISTING_CLIENT = { kind: 'existing', clientId: '7', phone: '9980001111', nip: '2222' } as const

// Answers every request with `answer` and records what the adapter sent.
function fakeApi(answer: () => Response) {
  const sent: SentRequest[] = []
  const fetchFake = async (url: string | URL | Request, init?: RequestInit) => {
    sent.push({
      url: String(url),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    })
    return answer()
  }
  const client = new ApiClient('http://localhost:3000/api', async () => 'token-de-sesion', fetchFake)
  return { repository: new ApiClientsRepository(client), sent }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('The clients through the API', () => {
  it('reads the clients with the session token', async () => {
    const { repository, sent } = fakeApi(() => json(200, [ROSA]))

    expect(await repository.clients()).toEqual([ROSA])
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ url: 'http://localhost:3000/api/clients', method: 'GET' })
    expect(sent[0].headers.get('Authorization')).toBe('Bearer token-de-sesion')
  })

  it('sends a new client with her name, phone and NIP', async () => {
    const { repository, sent } = fakeApi(() => json(201, { client: { ...ROSA, id: '9' } }))

    expect(await repository.enroll(NEW_CLIENT)).toEqual({ kind: 'saved' })
    expect(sent).toEqual([expect.objectContaining({
      url: 'http://localhost:3000/api/clients',
      method: 'POST',
      body: { name: 'Marta Gil', phone: '9985551234', nip: '4321' },
    })])
  })

  it('gives an existing client access by her id, without a name', async () => {
    const { repository, sent } = fakeApi(() => json(200, { client: ROSA }))

    expect(await repository.enroll(EXISTING_CLIENT)).toEqual({ kind: 'saved' })
    expect(sent).toEqual([expect.objectContaining({
      url: 'http://localhost:3000/api/clients/7/access',
      method: 'PUT',
      body: { phone: '9980001111', nip: '2222' },
    })])
  })

  it.each([
    ['name', 400, 'Escribe el nombre del cliente.', 'name'],
    ['phone', 400, 'Escribe el celular a 10 dígitos.', 'phone'],
    ['nip', 400, 'El NIP necesita 4 dígitos.', 'nip'],
    ['phone_taken', 409, 'Ese celular ya es de otro cliente.', 'phone'],
    ['not_found', 404, 'Ese cliente ya no existe.', undefined],
    ['not_admin', 403, 'Esta cuenta no tiene acceso al panel de administración.', undefined],
  ])('reads a %s refusal as the API worded it', async (code, status, message, field) => {
    const { repository } = fakeApi(() => json(status, { error: message, code }))

    expect(await repository.enroll(NEW_CLIENT)).toEqual({ kind: 'refused', message, field })
  })

  it.each([
    ['an answer that is not JSON', () => new Response('Bad Gateway', { status: 502 })],
    ['a code it does not know', () => json(500, { error: 'No pudimos completar la operación.', code: 'unavailable' })],
    ['an invalid id', () => json(400, { error: 'El identificador del cliente no es válido.', code: 'invalid_input' })],
  ])('reads %s as unavailable', async (_case, answer) => {
    const { repository } = fakeApi(answer)

    expect(await repository.enroll(EXISTING_CLIENT)).toEqual({ kind: 'unavailable' })
  })

  it('reads how many appointments and orders a client has', async () => {
    const { repository, sent } = fakeApi(() => json(200, { appointments: 2, orders: 1 }))

    expect(await repository.history('7')).toEqual({ appointments: 2, orders: 1 })
    expect(sent).toEqual([expect.objectContaining({ url: 'http://localhost:3000/api/clients/7/history', method: 'GET' })])
  })

  it('deletes a client by her id', async () => {
    const { repository, sent } = fakeApi(() => new Response(null, { status: 204 }))

    await repository.remove('7')

    expect(sent).toEqual([expect.objectContaining({ url: 'http://localhost:3000/api/clients/7', method: 'DELETE' })])
  })

  it('throws the refusal of a deletion as the API worded it', async () => {
    const { repository } = fakeApi(() => json(404, { error: 'Ese cliente ya no existe.', code: 'not_found' }))

    await expect(repository.remove('7')).rejects.toEqual(new ApiError(404, 'not_found', 'Ese cliente ya no existe.'))
  })

  it('reads a network failure as unavailable', async () => {
    const { repository } = fakeApi(() => {
      throw new TypeError('Failed to fetch')
    })

    expect(await repository.enroll(NEW_CLIENT)).toEqual({ kind: 'unavailable' })
  })
})
