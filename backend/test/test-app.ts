import { createApp, type AppDependencies } from '../src/app.js'
import type { AuthAccounts } from '../src/types/client.js'
import { InMemoryAgendaRepository } from './in-memory-agenda-repository.js'
import { InMemoryClientAppRepository, RecordingClientSessions } from './in-memory-client-app-repository.js'
import { InMemoryClientRepository } from './in-memory-client-repository.js'
import { InMemoryOrderRepository } from './in-memory-order-repository.js'
import { InMemoryServiceRepository } from './in-memory-service-repository.js'

export const ADMIN_TOKEN = 'token-de-administradora'
export const CLIENT_TOKEN = 'token-de-clienta'
export const ALLOWED_ORIGIN = 'http://localhost:5173'
export const ADMIN_ID = 'admin-user-id'
export const CLIENT_USER_ID = 'client-user-id'
// 2026-12-01 10:00 on Cancún's wall clock (UTC−5).
export const TEST_NOW = new Date('2026-12-01T15:00:00Z')

const USER_ID_BY_TOKEN = new Map([
  [ADMIN_TOKEN, ADMIN_ID],
  [CLIENT_TOKEN, CLIENT_USER_ID],
])

// Records each auth email change and user deletion instead of calling Supabase.
export class RecordingAuthAccounts implements AuthAccounts {
  readonly emailChanges: { userId: string; email: string }[] = []
  readonly deletedUsers: string[] = []

  async updateEmail(userId: string, email: string): Promise<void> {
    this.emailChanges.push({ userId, email })
  }

  async deleteUser(userId: string): Promise<void> {
    this.deletedUsers.push(userId)
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
    clientApp: new InMemoryClientAppRepository(),
    clientSessions: new RecordingClientSessions(),
    now: () => TEST_NOW,
    ...dependencies,
  })
}

export function asAdmin() {
  return { Authorization: `Bearer ${ADMIN_TOKEN}` }
}

export function asClient() {
  return { Authorization: `Bearer ${CLIENT_TOKEN}` }
}
