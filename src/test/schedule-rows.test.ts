import { describe, expect, it } from 'vitest'
import { scheduleRowsOf, weeklyScheduleFrom } from '../services/schedule-rows'

const ADMIN_ID = 'admin-uuid'

describe('Weekly schedule rows', () => {
  it('reads open days with their hours and closed days without any', () => {
    const schedule = weeklyScheduleFrom([
      { weekday: 'monday', opens_at: '10:00:00', closes_at: '18:00:00', updated_by: ADMIN_ID },
      { weekday: 'sunday', opens_at: null, closes_at: null, updated_by: ADMIN_ID },
    ])

    expect(schedule.monday).toEqual({ isOpen: true, opensAt: '10:00', closesAt: '18:00' })
    expect(schedule.sunday).toEqual({ isOpen: false })
  })

  it('treats a weekday without a row as closed', () => {
    expect(weeklyScheduleFrom([]).friday).toEqual({ isOpen: false })
  })

  it('writes one row per weekday, with null hours for a closed day', () => {
    const rows = scheduleRowsOf(
      {
        monday: { isOpen: true, opensAt: '10:00', closesAt: '18:00' },
        tuesday: { isOpen: false },
        wednesday: { isOpen: false },
        thursday: { isOpen: false },
        friday: { isOpen: false },
        saturday: { isOpen: false },
        sunday: { isOpen: false },
      },
      ADMIN_ID,
    )

    expect(rows).toHaveLength(7)
    expect(rows[0]).toEqual({
      weekday: 'monday',
      opens_at: '10:00',
      closes_at: '18:00',
      updated_by: ADMIN_ID,
    })
    expect(rows[1]).toEqual({
      weekday: 'tuesday',
      opens_at: null,
      closes_at: null,
      updated_by: ADMIN_ID,
    })
  })
})
