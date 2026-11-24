// @vitest-environment node
import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ADMIN_TOKEN, asAdmin, testApp } from './test-app.js'

afterEach(() => {
  vi.restoreAllMocks()
})

// Collects the lines the app logs, one per request.
function recordingApp() {
  const lines: string[] = []
  return { app: testApp({ logRequest: (line) => lines.push(line) }), lines }
}

describe('The request log', () => {
  it('logs one line with the method, path, status and time of each request', async () => {
    const { app, lines } = recordingApp()

    await request(app).get('/api/services').set(asAdmin())

    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^GET \/api\/services 200 \d+ms$/)
  })

  it('logs refused requests too', async () => {
    const { app, lines } = recordingApp()

    await request(app).get('/api/services?active=true')

    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^GET \/api\/services 401 \d+ms$/)
  })

  it('never logs the token or the body', async () => {
    const { app, lines } = recordingApp()

    await request(app)
      .post('/api/services')
      .set(asAdmin())
      .send({ name: 'Bastilla secreta', price: { kind: 'inStore' }, estimatedDays: 2 })

    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatch(/^POST \/api\/services 201 \d+ms$/)
    expect(lines[0]).not.toContain(ADMIN_TOKEN)
    expect(lines[0]).not.toContain('Bastilla secreta')
  })

  it('goes to the terminal unless the app is given another log', async () => {
    const printed = vi.spyOn(console, 'log').mockImplementation(() => {})

    await request(testApp({ logRequest: undefined })).get('/api/health')

    expect(printed).toHaveBeenCalledTimes(1)
    expect(printed.mock.calls[0]?.[0]).toMatch(/^GET \/api\/health 200 \d+ms$/)
  })
})
