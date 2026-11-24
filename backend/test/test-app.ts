import { createApp, type AppDependencies } from '../src/app.js'
import type { AuthAccounts } from '../src/types/client.js'
import { InMemoryAgendaRepository } from './in-memory-agenda-repository.js'
import { InMemoryClientRepository } from './in-memory-client-repository.js'
import { InMemoryOrderRepository } from './in-memory-order-repository.js'
import { InMemoryServiceRepository } from './in-memory-service-repository.js'

export const ADMIN_TOKEN = 'token-de-administradora'
export const CLIENT_TOKEN = 'token-de-clienta'
export const ALLOWED_ORIGIN = 'http://localhost:5173'
export const ADMIN_ID = 'admin-user-id'

const USER_ID_BY_TOKEN = new Map([
  [ADMIN_TOKEN, ADMIN_ID],
  [CLIENT_TOKEN, 'client-user-id'],
])

// Records each auth email change instead of calling Supabase.
export class RecordingAuthAccounts implements AuthAccounts {
  readonly emailChanges: { userId: string; email: string }[] = []

  async updateEmail(userId: string, email: string): Promise<void> {
    this.emailChanges.push({ userId, email })
  }
}

// The app with fakes in place of Supabase Auth and Postgres; a test passes the ones it inspects.
// It logs no requests, so the test output stays readable.
export function testApp(dependencies: Partial<AppDependencies> = {}) {
  return createApp({
    corsOrigin: ALLOWED_ORIGIN,
    logRequest: () => {},
    identity: { userIdForToken: async (token) => USER_ID_BY_TOKEN.get(token) ?? null },
    admins: { isAdmin: async (userId) => userId === ADMIN_ID },
    services: new InMemoryServiceRepository(),
    clients: new InMemoryClientRepository(),
    authAccounts: new RecordingAuthAccounts(),
    agenda: new InMemoryAgendaRepository(),
    orders: new InMemoryOrderRepository(),
    ...dependencies,
  })
}

export function asAdmin() {
  return { Authorization: `Bearer ${ADMIN_TOKEN}` }
}
