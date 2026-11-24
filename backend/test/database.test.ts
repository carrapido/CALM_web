// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPool } from '../src/config/database.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createPool', () => {
  it('logs a dropped idle connection instead of crashing the process', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    const pool = createPool('postgresql://user:pass@localhost:1/db') // safe-anything:ignore (fake URL)

    expect(() => pool.emit('error', new Error('terminating connection due to administrator command'))).not.toThrow()
    expect(logged).toHaveBeenCalled()
    await pool.end()
  })
})
