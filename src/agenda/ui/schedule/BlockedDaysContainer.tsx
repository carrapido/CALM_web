import type { AgendaRepository } from '../../application/agenda-repository'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import { useQuery } from '../../../shared/ui/useQuery'
import { BlockedDays } from './BlockedDays'

type BlockedDaysContainerProps = {
  repository: AgendaRepository
  today: CalendarDate
}

export function BlockedDaysContainer({ repository, today }: BlockedDaysContainerProps) {
  const { data: blockedDates, reload } = useQuery('blocked-dates', () => repository.blockedDates())

  const unblock = (date: CalendarDate) => repository.unblockDay(date).then(reload)

  return <BlockedDays dates={blockedDates && fromToday(blockedDates, today)} onUnblock={unblock} />
}

// A past blocked day no longer changes anything. `YYYY-MM-DD` dates sort chronologically.
function fromToday(dates: CalendarDate[], today: CalendarDate): CalendarDate[] {
  return dates.filter((date) => date >= today).sort()
}
