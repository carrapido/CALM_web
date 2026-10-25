import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../shared/ui/atoms/Button'
import { WEEKDAYS_FROM_MONDAY, type Weekday } from '../../../shared/domain/calendar-date'
import { SCHEDULE_TIMES, closesAfterOpening, type WeeklySchedule } from '../../domain/schedule'
import { WEEKDAY_LABELS } from '../format'

type MyScheduleFormProps = {
  schedule: WeeklySchedule
  onSave: (schedule: WeeklySchedule) => void
  onCancel: () => void
}

// A closed day keeps its times in the draft, so reopening it restores them.
type HoursDraft = { isOpen: boolean; opensAt: string; closesAt: string }

type ScheduleDraft = Record<Weekday, HoursDraft>

const HOURS_FOR_A_NEW_DAY = { opensAt: '10:00', closesAt: '18:00' }

export function MyScheduleForm({ schedule, onSave, onCancel }: MyScheduleFormProps) {
  const [draft, setDraft] = useState(() => toDraft(schedule))
  const [invalidDays, setInvalidDays] = useState<Weekday[]>([])

  const changeDay = (weekday: Weekday, hours: HoursDraft) =>
    setDraft((current) => ({ ...current, [weekday]: hours }))

  const save = (event: FormEvent) => {
    event.preventDefault()
    const daysToFix = daysClosingBeforeOpening(draft)
    setInvalidDays(daysToFix)
    if (daysToFix.length === 0) onSave(toSchedule(draft))
  }

  return (
    <form onSubmit={save} className="mt-space-lg flex flex-col gap-space-lg">
      <h2 className="text-headline-lg text-on-surface">Mi horario</h2>
      {WEEKDAYS_FROM_MONDAY.map((weekday) => (
        <WeekdayHours
          key={weekday}
          label={WEEKDAY_LABELS[weekday]}
          hours={draft[weekday]}
          isInvalid={invalidDays.includes(weekday)}
          onChange={(hours) => changeDay(weekday, hours)}
        />
      ))}
      <div className="grid gap-space-sm sm:grid-cols-2">
        <Button type="submit" variant="primary" icon="check">
          Guardar horario
        </Button>
        <Button icon="close" onClick={onCancel}>
          Volver sin guardar
        </Button>
      </div>
    </form>
  )
}

function toDraft(schedule: WeeklySchedule): ScheduleDraft {
  const entries = WEEKDAYS_FROM_MONDAY.map((weekday) => {
    const hours = schedule[weekday]
    const draft = hours.isOpen ? hours : { isOpen: false, ...HOURS_FOR_A_NEW_DAY }
    return [weekday, draft]
  })
  return Object.fromEntries(entries)
}

function daysClosingBeforeOpening(draft: ScheduleDraft): Weekday[] {
  return WEEKDAYS_FROM_MONDAY.filter(
    (weekday) => draft[weekday].isOpen && !closesAfterOpening(draft[weekday]),
  )
}

function toSchedule(draft: ScheduleDraft): WeeklySchedule {
  const entries = WEEKDAYS_FROM_MONDAY.map((weekday) => {
    const { isOpen, opensAt, closesAt } = draft[weekday]
    return [weekday, isOpen ? { isOpen, opensAt, closesAt } : { isOpen }]
  })
  return Object.fromEntries(entries)
}

type WeekdayHoursProps = {
  label: string
  hours: HoursDraft
  isInvalid: boolean
  onChange: (hours: HoursDraft) => void
}

function WeekdayHours({ label, hours, isInvalid, onChange }: WeekdayHoursProps) {
  return (
    <fieldset className="flex flex-col gap-space-sm rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest p-space-md">
      <legend className="px-space-xs text-headline-sm text-on-surface">{label}</legend>
      <label className="flex min-h-12 items-center gap-space-sm text-title-md text-on-surface">
        <input
          type="checkbox"
          checked={hours.isOpen}
          onChange={(event) => onChange({ ...hours, isOpen: event.target.checked })}
          className="size-6 accent-primary"
        />
        Abierto
      </label>
      {hours.isOpen ? (
        <div className="grid grid-cols-2 gap-space-sm">
          <TimeSelect
            label="Abre"
            value={hours.opensAt}
            onChange={(opensAt) => onChange({ ...hours, opensAt })}
          />
          <TimeSelect
            label="Cierra"
            value={hours.closesAt}
            onChange={(closesAt) => onChange({ ...hours, closesAt })}
          />
        </div>
      ) : (
        <p className="text-on-surface-variant">Cerrado</p>
      )}
      {isInvalid && (
        <p role="alert" className="rounded-lg bg-error-container p-space-sm text-on-error-container">
          La hora de cierre debe ser después de la apertura
        </p>
      )}
    </fieldset>
  )
}

type TimeSelectProps = {
  label: string
  value: string
  onChange: (time: string) => void
}

// Labelled by id: a wrapping <label> would add the selected time to the select's name.
function TimeSelect({ label, value, onChange }: TimeSelectProps) {
  const id = useId()

  return (
    <div className="flex flex-col gap-space-xs">
      <label htmlFor={id} className="text-on-surface-variant">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 rounded-lg border-2 border-outline bg-surface-container-lowest px-space-sm text-title-md tabular-nums text-on-surface"
      >
        {SCHEDULE_TIMES.map((time) => (
          <option key={time} value={time}>
            {time}
          </option>
        ))}
      </select>
    </div>
  )
}
