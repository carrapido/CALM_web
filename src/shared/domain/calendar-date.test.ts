import { describe, expect, it } from 'vitest'
import { addMonths, firstDayOfMonth } from './calendar-date'

describe('firstDayOfMonth', () => {
  it('moves any day to the first of its month', () => {
    expect(firstDayOfMonth('2026-10-24')).toBe('2026-10-01')
    expect(firstDayOfMonth('2026-10-01')).toBe('2026-10-01')
  })
})

describe('addMonths', () => {
  it('moves forward and back across years', () => {
    expect(addMonths('2026-10-01', 1)).toBe('2026-11-01')
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15')
    expect(addMonths('2026-01-01', -1)).toBe('2025-12-01')
  })

  it('keeps the day inside a shorter month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-03-31', -1)).toBe('2028-02-29')
  })
})
