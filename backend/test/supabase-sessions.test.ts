// @vitest-environment node
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { supabaseClientSessions } from '../src/config/supabase-sessions.js'

// A stand-in for the Supabase Auth endpoints the sessions call, recording what reaches it.
type Received = { method: string; path: string; apikey: string; body: unknown }

const SERVICE_KEY = 'service-role-key'
const PUBLISHABLE_KEY = 'publishable-key'
const USER = { id: '00000000-0000-4000-8000-000000000031', email: '9981234567@clients.calm.app', aud: 'authenticated', app_metadata: {}, user_metadata: {} }

let server: http.Server
let authUrl = ''
let received: Received[] = []
let linkStatus = 200

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      const path = new URL(req.url ?? '', 'http://stub').pathname
      received.push({ method: req.method ?? '', path, apikey: String(req.headers.apikey), body: body === '' ? null : JSON.parse(body) })
      const [status, answer] = answerFor(path)
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(JSON.stringify(answer))
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  authUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  received = []
  linkStatus = 200
})

function answerFor(path: string): [number, unknown] {
  if (path === '/auth/v1/admin/users') return [200, { ...USER, id: 'created-user' }]
  if (path === `/auth/v1/admin/users/${USER.id}`) return [200, USER]
  if (path === '/auth/v1/admin/generate_link') {
    return linkStatus === 200 ? [200, { ...USER, hashed_token: 'hashed-1', action_link: 'x' }] : [linkStatus, { msg: 'no' }]
  }
  if (path === '/auth/v1/verify') {
    return [200, { access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600, token_type: 'bearer', user: USER }]
  }
  return [404, { msg: 'unknown' }]
}

function sessions() {
  return supabaseClientSessions(authUrl, SERVICE_KEY, PUBLISHABLE_KEY)
}

describe('supabaseClientSessions', () => {
  it('creates a confirmed auth user that names her client in app_metadata', async () => {
    expect(await sessions().createAuthUser('9981234567@clients.calm.app', '7')).toBe('created-user')

    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({
      method: 'POST',
      path: '/auth/v1/admin/users',
      apikey: SERVICE_KEY,
      body: { email: '9981234567@clients.calm.app', email_confirm: true, app_metadata: { client_id: 7 } },
    })
  })

  it('mints a magic link with the service role and redeems it with the publishable key', async () => {
    expect(await sessions().refreshTokenFor(USER.id)).toBe('refresh-1')

    expect(received.map(({ path, apikey }) => [path, apikey])).toEqual([
      [`/auth/v1/admin/users/${USER.id}`, SERVICE_KEY],
      ['/auth/v1/admin/generate_link', SERVICE_KEY],
      ['/auth/v1/verify', PUBLISHABLE_KEY],
    ])
    expect(received[1]?.body).toMatchObject({ type: 'magiclink', email: USER.email })
    expect(received[2]?.body).toMatchObject({ token_hash: 'hashed-1', type: 'email' })
  })

  it('answers null when Supabase will not mint the link', async () => {
    linkStatus = 422

    expect(await sessions().refreshTokenFor(USER.id)).toBeNull()
    expect(received.map(({ path }) => path)).not.toContain('/auth/v1/verify')
  })
})
