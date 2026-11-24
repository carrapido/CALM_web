import { createApp } from '../src/app.js'
import type { ServiceRepository } from '../src/types/service.js'
import { InMemoryServiceRepository } from './in-memory-service-repository.js'

export const ADMIN_TOKEN = 'token-de-administradora'
export const CLIENT_TOKEN = 'token-de-clienta'
export const ALLOWED_ORIGIN = 'http://localhost:5173'

const USER_ID_BY_TOKEN = new Map([
  [ADMIN_TOKEN, 'admin-user-id'],
  [CLIENT_TOKEN, 'client-user-id'],
])

// The app with fakes in place of Supabase Auth and Postgres.
export function testApp(services: ServiceRepository = new InMemoryServiceRepository()) {
  return createApp({
    corsOrigin: ALLOWED_ORIGIN,
    identity: { userIdForToken: async (token) => USER_ID_BY_TOKEN.get(token) ?? null },
    admins: { isAdmin: async (userId) => userId === 'admin-user-id' },
    services,
  })
}

export function asAdmin() {
  return { Authorization: `Bearer ${ADMIN_TOKEN}` }
}
