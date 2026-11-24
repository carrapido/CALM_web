import { weekDates } from './week-agenda'
import { addDays, addMonths, firstDayOfMonth, type CalendarDate } from './calendar-date'

// The whole Monday-to-Sunday weeks that cover the month holding `date`, days of the
// neighbouring months included.
export function monthWeeks(date: CalendarDate): CalendarDate[][] {
  const firstDay = firstDayOfMonth(date)
  const lastDay = addDays(addMonths(firstDay, 1), -1)
  const weeks: CalendarDate[][] = []
  for (let monday = weekDates(firstDay)[0]; monday <= lastDay; monday = addDays(monday, 7)) {
    weeks.push(weekDates(monday))
  }
  return weeks
}
