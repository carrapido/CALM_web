import {
  FunctionsFetchError,
  FunctionsHttpError,
  type SupabaseClient,
} from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import type { Database } from '../../shared/infrastructure/database.types'
import { SupabaseClientsRepository } from './supabase-clients-repository'

type InvokeAnswer = { data: unknown; error: unknown }
type Invocation = { name: string; options: { body: unknown } }

// Fakes only the Supabase calls the adapter makes, and records what it asks for.
function fakeSupabase(answer: InvokeAnswer, rows: unknown[] = []) {
  const invocations: Invocation[] = []
  const selections: { table: string; columns: string }[] = []
  const client = {
    from: (table: string) => ({
      select: (columns: string) => {
        selections.push({ table, columns })
        return Promise.resolve({ data: rows, error: null })
      },
    }),
    functions: {
      invoke: async (name: string, options: { body: unknown }) => {
        invocations.push({ name, options })
        return answer
      },
    },
  }
  // The only cast in this file: the fake implements the subset of SupabaseClient the adapter uses.
  const repository = new SupabaseClientsRepository(client as unknown as SupabaseClient<Database>)
  return { repository, invocations, selections }
}

function refusal(status: number, body: string): FunctionsHttpError {
  return new FunctionsHttpError(new Response(body, { status }))
}

const NEW_CLIENT = { kind: 'new', name: 'Marta Gil', phone: '9985551234', nip: '4321' } as const

describe('Reading the clients', () => {
  it('reads each client and her access without the NIP hash', async () => {
    const { repository, selections } = fakeSupabase({ data: null, error: null }, [
      { id: 7, name: 'Rosa Méndez', phone: '9981234567', has_app_access: true },
      { id: 8, name: 'Ángela Ruiz', phone: null, has_app_access: false },
    ])

    expect(await repository.clients()).toEqual([
      { id: '7', name: 'Rosa Méndez', phone: '9981234567', hasAppAccess: true },
      { id: '8', name: 'Ángela Ruiz', phone: null, hasAppAccess: false },
    ])
    expect(selections).toEqual([{ table: 'clients', columns: 'id, name, phone, has_app_access' }])
  })
})

describe('Enrolling a client through admin-enroll-client', () => {
  it('sends a new client with her name, phone and NIP', async () => {
    const { repository, invocations } = fakeSupabase({ data: { client_id: 9 }, error: null })

    expect(await repository.enroll(NEW_CLIENT)).toEqual({ kind: 'saved' })
    expect(invocations).toEqual([
      {
        name: 'admin-enroll-client',
        options: { body: { name: 'Marta Gil', phone: '9985551234', nip: '4321' } },
      },
    ])
  })

  it('sends an existing client by her numeric id', async () => {
    const { repository, invocations } = fakeSupabase({ data: { client_id: 7 }, error: null })

    await repository.enroll({ kind: 'existing', clientId: '7', phone: '9981234567', nip: '2468' })

    expect(invocations[0].options.body).toEqual({ client_id: 7, phone: '9981234567', nip: '2468' })
  })

  it.each([
    [400, 'name', 'name'],
    [400, 'phone', 'phone'],
    [400, 'nip', 'nip'],
    [403, 'not_admin', undefined],
    [404, 'not_found', undefined],
    [409, 'phone_taken', 'phone'],
  ])('reads an HTTP %i refusal with code %s as its message, beside %s', async (status, code, field) => {
    const { repository } = fakeSupabase({
      data: null,
      error: refusal(status, JSON.stringify({ error: `Mensaje de ${code}`, code })),
    })

    expect(await repository.enroll(NEW_CLIENT)).toEqual({
      kind: 'refused',
      message: `Mensaje de ${code}`,
      field,
    })
  })

  it.each([
    ['a failed request', new FunctionsFetchError(new TypeError('Failed to fetch'))],
    ['a refusal that is not JSON', refusal(502, '<html>Bad gateway</html>')],
    ['a refusal with an unknown code', refusal(500, JSON.stringify({ error: 'Boom', code: 'internal' }))],
    ['a refusal without a message', refusal(400, JSON.stringify({ code: 'phone' }))],
  ])('reads %s as unavailable', async (_case, error) => {
    const { repository } = fakeSupabase({ data: null, error })

    expect(await repository.enroll(NEW_CLIENT)).toEqual({ kind: 'unavailable' })
  })
})
