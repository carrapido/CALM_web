import { describe, expect, it } from 'vitest'
import { monthWeeks } from './month-grid'

describe('monthWeeks', () => {
  it('covers the month in whole weeks from Monday to Sunday', () => {
    const weeks = monthWeeks('2026-10-24')
    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toEqual([
      '2026-09-28',
      '2026-09-29',
      '2026-09-30',
      '2026-10-01',
      '2026-10-02',
      '2026-10-03',
      '2026-10-04',
    ])
    expect(weeks[4].at(-1)).toBe('2026-11-01')
  })

  it('starts on the first when the month opens on a Monday', () => {
    const weeks = monthWeeks('2027-02-10')
    expect(weeks[0][0]).toBe('2027-02-01')
    expect(weeks.at(-1)?.at(-1)).toBe('2027-02-28')
    expect(weeks).toHaveLength(4)
  })

  it('adds a sixth week when the month spills over', () => {
    const weeks = monthWeeks('2026-08-01')
    expect(weeks).toHaveLength(6)
    expect(weeks[0][0]).toBe('2026-07-27')
    expect(weeks[5].at(-1)).toBe('2026-09-06')
  })
})
