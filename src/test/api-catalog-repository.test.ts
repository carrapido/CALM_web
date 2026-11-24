import { describe, expect, it } from 'vitest'
import { ApiCatalogRepository } from '../services/api-catalog-repository'
import { ApiClient, ApiError } from '../services/api-client'
import type { Service } from '../types/service'

type SentRequest = { url: string; method: string; headers: Headers; body: unknown }

const PATCH: Service = {
  id: '3',
  name: 'Parche',
  price: { kind: 'base', amountMxn: 40 },
  estimatedDays: 0,
  isActive: true,
}

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
  const client = new ApiClient('http://localhost:3000/api/', async () => 'token-de-sesion', fetchFake)
  return { repository: new ApiCatalogRepository(client), sent }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('The catalog through the API', () => {
  it('reads the services with the session token', async () => {
    const { repository, sent } = fakeApi(() => json(200, [PATCH]))

    expect(await repository.services()).toEqual([PATCH])
    expect(sent).toHaveLength(1)
    expect(sent[0]).toMatchObject({ url: 'http://localhost:3000/api/services', method: 'GET' })
    expect(sent[0].headers.get('Authorization')).toBe('Bearer token-de-sesion')
  })

  it('adds a service and returns the one the API created', async () => {
    const { repository, sent } = fakeApi(() => json(201, PATCH))
    const details = { name: 'Parche', price: PATCH.price, estimatedDays: 0 }

    expect(await repository.addService(details)).toEqual(PATCH)
    expect(sent[0]).toMatchObject({ url: 'http://localhost:3000/api/services', method: 'POST', body: details })
    expect(sent[0].headers.get('Content-Type')).toBe('application/json')
  })

  it('updates a service by its id', async () => {
    const { repository, sent } = fakeApi(() => json(200, { ...PATCH, isActive: false }))

    await repository.updateService({ ...PATCH, isActive: false })

    expect(sent[0]).toMatchObject({
      url: 'http://localhost:3000/api/services/3',
      method: 'PUT',
      body: { name: 'Parche', price: PATCH.price, estimatedDays: 0, isActive: false },
    })
  })

  it('deletes a service by its id', async () => {
    const { repository, sent } = fakeApi(() => new Response(null, { status: 204 }))

    await repository.deleteService('3')

    expect(sent[0]).toMatchObject({ url: 'http://localhost:3000/api/services/3', method: 'DELETE' })
  })

  it('throws the status, code and message of a JSON error', async () => {
    const message = 'No se puede eliminar porque hay citas que usan este servicio.'
    const { repository } = fakeApi(() => json(409, { error: message, code: 'service_in_use' }))

    const failure = repository.deleteService('6')

    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.toMatchObject({ status: 409, code: 'service_in_use', message })
  })

  it('throws an unavailable error when the answer is not JSON', async () => {
    const { repository } = fakeApi(() => new Response('Bad Gateway', { status: 502 }))

    await expect(repository.services()).rejects.toMatchObject({
      status: 502,
      code: 'unavailable',
      message: 'No pudimos completar la operación. Inténtalo de nuevo.',
    })
  })
})
