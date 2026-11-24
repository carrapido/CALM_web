import type { AgendaRepository } from '../services/agenda-repository'
import type { CalendarDate } from '../utils/calendar-date'
import { useQuery } from '../hooks/useQuery'
import { BlockedDays } from './BlockedDays'
import { LoadError } from './LoadError'

type BlockedDaysContainerProps = {
  repository: AgendaRepository
  today: CalendarDate
}

export function BlockedDaysContainer({ repository, today }: BlockedDaysContainerProps) {
  const { data: blockedDates, error, reload } = useQuery('blocked-dates', () => repository.blockedDates())

  const unblock = (date: CalendarDate) => repository.unblockDay(date).then(reload)

  return (
    <BlockedDays
      dates={blockedDates && fromToday(blockedDates, today)}
      loadError={error !== undefined && <LoadError error={error} onRetry={reload} />}
      onUnblock={unblock}
    />
  )
}

// A past blocked day no longer changes anything. `YYYY-MM-DD` dates sort chronologically.
function fromToday(dates: CalendarDate[], today: CalendarDate): CalendarDate[] {
  return dates.filter((date) => date >= today).sort()
}
