import type { AgendaRepository } from '../../application/agenda-repository'
import { todayInCancun, type CalendarDate } from '../../../shared/domain/calendar-date'
import { weekAgenda, weekDates } from '../../domain/week-agenda'
import { useQuery } from '../../../shared/ui/useQuery'
import { WeekView } from './WeekView'

type WeekAgendaContainerProps = {
  repository: AgendaRepository
  now: () => Date
  date: CalendarDate
  onChooseDay: (date: CalendarDate) => void
  onBackToDay: () => void
}

export function WeekAgendaContainer({
  repository,
  now,
  date,
  onChooseDay,
  onBackToDay,
}: WeekAgendaContainerProps) {
  const dates = weekDates(date)
  const { data } = useQuery(dates[0], () => loadWeek(repository, dates))

  return (
    <WeekView
      dates={dates}
      days={data}
      today={todayInCancun(now())}
      onChooseDay={onChooseDay}
      onBackToDay={onBackToDay}
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
