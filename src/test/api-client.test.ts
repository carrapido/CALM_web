import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiClient } from '../services/api-client'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ApiClient with the browser fetch', () => {
  it('calls fetch as the browser requires, without its own object as `this`', async () => {
    // Browsers throw "Illegal invocation" when fetch runs with any `this` other than window.
    vi.stubGlobal(
      'fetch',
      vi.fn(function (this: unknown) {
        if (this !== undefined && this !== globalThis) {
          return Promise.reject(new TypeError("Failed to execute 'fetch' on 'Window': Illegal invocation"))
        }
        return Promise.resolve(new Response('[]', { status: 200 }))
      }),
    )
    const client = new ApiClient('http://localhost:3000/api', async () => 'token')

    await expect(client.json('GET', '/services')).resolves.toEqual([])
  })
})
