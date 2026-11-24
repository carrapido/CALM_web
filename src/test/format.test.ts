import { describe, expect, it } from 'vitest'
import { formatMonthLabel } from '../utils/format'

describe('formatMonthLabel', () => {
  it('names the month, capitalized, and its year', () => {
    expect(formatMonthLabel('2026-10-24')).toBe('Octubre 2026')
    expect(formatMonthLabel('2027-01-01')).toBe('Enero 2027')
  })
})
