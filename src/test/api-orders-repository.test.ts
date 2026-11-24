import { describe, expect, it } from 'vitest'
import { ApiClient } from '../services/api-client'
import { ApiOrdersRepository } from '../services/api-orders-repository'
import type { Order } from '../utils/order'

type SentRequest = { url: string; method: string; headers: Headers; body: unknown }

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
  return { repository: new ApiOrdersRepository(client), sent }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('The orders through the API', () => {
  it('reads the orders with the session token', async () => {
    const { repository, sent } = fakeApi(() => json(200, [ANA_HEM]))

    expect(await repository.orders()).toEqual([ANA_HEM])
    expect(sent).toEqual([expect.objectContaining({ url: 'http://localhost:3000/api/orders', method: 'GET' })])
    expect(sent[0].headers.get('Authorization')).toBe('Bearer token-de-sesion')
  })

  it('adds an order by sending it whole', async () => {
    const { repository, sent } = fakeApi(() => json(201, ANA_HEM))

    await repository.addOrder(ANA_HEM)

    expect(sent).toEqual([
      expect.objectContaining({ url: 'http://localhost:3000/api/orders', method: 'POST', body: ANA_HEM }),
    ])
  })

  it('updates the active order by its ticket with only what can change', async () => {
    const { repository, sent } = fakeApi(() => json(200, { ...ANA_HEM, status: 'ready' }))

    await repository.updateActiveOrder({ ...ANA_HEM, status: 'ready' })

    expect(sent).toEqual([
      expect.objectContaining({
        url: 'http://localhost:3000/api/orders/0427',
        method: 'PUT',
        body: { work: 'Dobladillo de pantalón', finalPriceMxn: 120, deliveryDate: '2026-05-20', status: 'ready' },
      }),
    ])
  })

  it('throws the code and message when the ticket is taken', async () => {
    const message = 'Ya hay un pedido activo con ese folio.'
    const { repository } = fakeApi(() => json(409, { error: message, code: 'ticket_taken' }))

    await expect(repository.addOrder(ANA_HEM)).rejects.toMatchObject({ status: 409, code: 'ticket_taken', message })
  })
})
