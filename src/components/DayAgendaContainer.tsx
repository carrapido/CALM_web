import type { AgendaRepository } from '../services/agenda-repository'
import { addDays, momentInCancun, type CalendarDate } from '../utils/calendar-date'
import { dayAgenda } from '../utils/day-agenda'
import { useQuery } from '../hooks/useQuery'
import { DayView } from './DayView'
import { LoadError } from './LoadError'

type DayAgendaContainerProps = {
  repository: AgendaRepository
  now: () => Date
  date: CalendarDate
  onDateChange: (date: CalendarDate) => void
}

export function DayAgendaContainer({ repository, now, date, onDateChange }: DayAgendaContainerProps) {
  const currentMoment = momentInCancun(now())
  const today = currentMoment.date
  const { data, error, reload } = useQuery(date, () => loadDay(repository, date))
  // Built on render, not when loading, so slots move before "Ahora" as time passes.
  const agenda =
    data && dayAgenda(data.schedule, date, data.appointments, data.blockedDates, currentMoment)

  const changeThenReload = (change: Promise<void>) => change.then(reload)

  return (
    // A new day starts with no appointment chosen.
    <DayView
      key={date}
      date={date}
      isToday={date === today}
      isPast={date < today}
      currentTime={currentMoment.time}
      agenda={agenda}
      loadError={error !== undefined && <LoadError error={error} onRetry={reload} />}
      navigation={{
        onPreviousDay: () => onDateChange(addDays(date, -1)),
        onNextDay: () => onDateChange(addDays(date, 1)),
        onBackToToday: () => onDateChange(today),
      }}
      actions={{
        onCancelAppointment: (ticket) => changeThenReload(repository.cancelAppointment(ticket, date)),
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
