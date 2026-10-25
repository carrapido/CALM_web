import type { AgendaRepository } from '../../application/agenda-repository'
import type { WeeklySchedule } from '../../domain/schedule'
import { useQuery } from '../../../shared/ui/useQuery'
import { MyScheduleForm } from './MyScheduleForm'

type MyScheduleContainerProps = {
  repository: AgendaRepository
  onDone: () => void
}

export function MyScheduleContainer({ repository, onDone }: MyScheduleContainerProps) {
  const { data: schedule } = useQuery('weekly-schedule', () => repository.weeklySchedule())

  const save = (newSchedule: WeeklySchedule) =>
    repository.saveWeeklySchedule(newSchedule).then(onDone)

  if (schedule === undefined) return <p className="mt-space-lg text-on-surface-variant">Cargando tu horario…</p>
  return <MyScheduleForm schedule={schedule} onSave={save} onCancel={onDone} />
}
