import type { AgendaRepository } from '../../application/agenda-repository'
import { addDays, momentInCancun, type CalendarDate } from '../../../shared/domain/calendar-date'
import { dayAgenda } from '../../domain/day-agenda'
import { useQuery } from '../../../shared/ui/useQuery'
import { DayView } from './DayView'

type DayAgendaContainerProps = {
  repository: AgendaRepository
  now: () => Date
  date: CalendarDate
  onDateChange: (date: CalendarDate) => void
  onShowWeek: () => void
}

export function DayAgendaContainer({
  repository,
  now,
  date,
  onDateChange,
  onShowWeek,
}: DayAgendaContainerProps) {
  const currentMoment = momentInCancun(now())
  const today = currentMoment.date
  const { data, reload } = useQuery(date, () => loadDay(repository, date))
  // Built on render, not when loading, so slots past the current time read "Pasado".
  const agenda =
    data && dayAgenda(data.schedule, date, data.appointments, data.blockedDates, currentMoment)

  const changeThenReload = (change: Promise<void>) => change.then(reload)

  return (
    <DayView
      date={date}
      isToday={date === today}
      isPast={date < today}
      agenda={agenda}
      navigation={{
        onPreviousDay: () => onDateChange(addDays(date, -1)),
        onNextDay: () => onDateChange(addDays(date, 1)),
        onBackToToday: () => onDateChange(today),
        onShowWeek,
      }}
      actions={{
        onCancelAppointment: (ticket) => changeThenReload(repository.cancelAppointment(ticket)),
        onBlockDay: () => changeThenReload(repository.blockDay(date)),
        onUnblockDay: () => changeThenReload(repository.unblockDay(date)),
      }}
    />
  )
}

async function loadDay(repository: AgendaRepository, date: CalendarDate) {
  const [schedule, appointments, blockedDates] = await Promise.all([
    repository.weeklySchedule(),
    repository.appointmentsBetween(date, date),
    repository.blockedDates(),
  ])
  return { schedule, appointments, blockedDates }
}
