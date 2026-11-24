// @vitest-environment node
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { supabaseIdentity } from '../src/config/supabase-auth.js'

// A stand-in for Supabase Auth's /user endpoint that answers with `status`.
let server: http.Server
let authUrl = ''
let status = 200

beforeAll(async () => {
  server = http.createServer((_req, res) => {
    res.writeHead(status, { 'content-type': 'application/json' })
    res.end(JSON.stringify(status === 200 ? { id: 'uid-1', aud: 'authenticated' } : { code: status, msg: 'x' }))
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  authUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterAll(() => {
  server.close()
})

describe('supabaseIdentity', () => {
  it('returns the user id for a valid token', async () => {
    status = 200
    expect(await supabaseIdentity(authUrl, 'pk').userIdForToken('tok')).toBe('uid-1')
  })

  it.each([401, 403])('returns null when Supabase answers %i', async (answer) => {
    status = answer
    expect(await supabaseIdentity(authUrl, 'pk').userIdForToken('tok')).toBeNull()
  })

  it.each([429, 500, 503])('throws when Supabase answers %i', async (answer) => {
    status = answer
    await expect(supabaseIdentity(authUrl, 'pk').userIdForToken('tok')).rejects.toThrow()
  })

  it('throws when Supabase cannot be reached', async () => {
    await expect(supabaseIdentity('http://127.0.0.1:1', 'pk').userIdForToken('tok')).rejects.toThrow()
  })
})
