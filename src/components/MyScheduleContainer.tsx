import type { AgendaRepository } from '../services/agenda-repository'
import type { CalendarDate } from '../utils/calendar-date'
import type { WeeklySchedule } from '../utils/schedule'
import { useQuery } from '../hooks/useQuery'
import { BlockedDaysContainer } from './BlockedDaysContainer'
import { LoadError } from './LoadError'
import { MyScheduleForm } from './MyScheduleForm'

type MyScheduleContainerProps = {
  repository: AgendaRepository
  today: CalendarDate
  onDone: () => void
}

// The weekly hours beside the blocked days; stacked when the agenda is narrower than @3xl.
export function MyScheduleContainer({ repository, today, onDone }: MyScheduleContainerProps) {
  const { data: schedule, error, reload } = useQuery('weekly-schedule', () => repository.weeklySchedule())

  const save = (newSchedule: WeeklySchedule) =>
    repository.saveWeeklySchedule(newSchedule).then(onDone)

  if (error !== undefined) return <LoadError error={error} onRetry={reload} className="mt-space-lg" />
  if (schedule === undefined) return <p className="mt-space-lg text-on-surface-variant">Cargando tu horario…</p>
  return (
    <div className="@container mt-space-lg flex flex-col gap-space-lg">
      <div className="flex flex-col gap-1">
        <h2 className="text-headline-lg text-on-surface">Mi horario</h2>
        <p className="text-body-md font-bold text-on-surface-variant">Tus clientes solo agendan en estas horas</p>
      </div>
      <div className="flex flex-col gap-7 @3xl:flex-row @3xl:items-start">
        <MyScheduleForm schedule={schedule} onSave={save} onCancel={onDone} />
        <BlockedDaysContainer repository={repository} today={today} />
      </div>
    </div>
  )
}
