import type { Session, SupabaseClient } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { SupabaseAdminAccess } from '../services/supabase-admin-access'

type FakeBackend = {
  session: Session | null
  adminIds: string[]
}

// Fakes only the Supabase calls the adapter makes, and records the sign-outs it asks for.
function fakeSupabase({ session, adminIds }: FakeBackend) {
  const signOutScopes: string[] = []
  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      signOut: async ({ scope }: { scope: string }) => {
        signOutScopes.push(scope)
        return { error: null }
      },
    },
    from: () => ({
      select: () => ({
        eq: (_column: string, userId: string) => ({
          maybeSingle: async () => ({
            data: adminIds.includes(userId) ? { id: userId } : null,
            error: null,
          }),
        }),
      }),
    }),
  }
  // The only cast in this file: the fake implements the subset of SupabaseClient the adapter uses.
  return { client: client as unknown as SupabaseClient, signOutScopes }
}

function sessionOf(userId: string): Session {
  return { user: { id: userId } } as Session
}

describe('Checking a stored session for the panel', () => {
  it('opens the panel for an admin with a stored session', async () => {
    const { client, signOutScopes } = fakeSupabase({
      session: sessionOf('admin-1'),
      adminIds: ['admin-1'],
    })

    expect(await new SupabaseAdminAccess(client).hasSession()).toBe(true)
    expect(signOutScopes).toEqual([])
  })

  it('signs out a stored session that is not an admin, so it does not linger in this browser', async () => {
    const { client, signOutScopes } = fakeSupabase({
      session: sessionOf('client-9'),
      adminIds: ['admin-1'],
    })

    expect(await new SupabaseAdminAccess(client).hasSession()).toBe(false)
    expect(signOutScopes).toEqual(['local'])
  })

  it('reports no session without signing anyone out when nothing is stored', async () => {
    const { client, signOutScopes } = fakeSupabase({ session: null, adminIds: ['admin-1'] })

    expect(await new SupabaseAdminAccess(client).hasSession()).toBe(false)
    expect(signOutScopes).toEqual([])
  })
})
