import type { AgendaRepository } from '../services/agenda-repository'
import { todayInCancun, type CalendarDate } from '../utils/calendar-date'
import { weekAgenda, weekDates } from '../utils/week-agenda'
import { useQuery } from '../hooks/useQuery'
import { LoadError } from './LoadError'
import { WeekView } from './WeekView'

type WeekAgendaContainerProps = {
  repository: AgendaRepository
  now: () => Date
  date: CalendarDate
  onChooseDay: (date: CalendarDate) => void
}

export function WeekAgendaContainer({
  repository,
  now,
  date,
  onChooseDay,
}: WeekAgendaContainerProps) {
  const dates = weekDates(date)
  const { data, error, reload } = useQuery(dates[0], () => loadWeek(repository, dates))

  return (
    <WeekView
      dates={dates}
      days={data}
      loadError={error !== undefined && <LoadError error={error} onRetry={reload} />}
      today={todayInCancun(now())}
      onChooseDay={onChooseDay}
    />
  )
}

async function loadWeek(repository: AgendaRepository, dates: CalendarDate[]) {
  const [schedule, appointments, blockedDates] = await Promise.all([
    repository.weeklySchedule(),
    repository.appointmentsBetween(dates[0], dates[dates.length - 1]),
    repository.blockedDates(),
  ])
  return weekAgenda(schedule, dates, appointments, blockedDates)
}
