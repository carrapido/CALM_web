import { describe, expect, it } from 'vitest'
import { clockTimeOf } from './clock-time'

describe('Reading a Postgres time column', () => {
  it('drops the seconds Postgres returns, so 10:30:00 reads as the 10:30 the panel shows', () => {
    expect(clockTimeOf('10:30:00')).toBe('10:30')
  })
})
