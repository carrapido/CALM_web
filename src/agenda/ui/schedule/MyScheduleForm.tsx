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

// Each day is checked while it is edited; a refused save also names the days to fix.
export function MyScheduleForm({ schedule, onSave, onCancel }: MyScheduleFormProps) {
  const [draft, setDraft] = useState(() => toDraft(schedule))
  const [hasTriedToSave, setHasTriedToSave] = useState(false)
  const daysToFix = daysClosingBeforeOpening(draft)

  const changeDay = (weekday: Weekday, hours: HoursDraft) =>
    setDraft((current) => ({ ...current, [weekday]: hours }))

  const save = (event: FormEvent) => {
    event.preventDefault()
    if (daysToFix.length > 0) {
      setHasTriedToSave(true)
      return
    }
    onSave(toSchedule(draft))
  }

  return (
    <form onSubmit={save} className="flex min-w-0 flex-1 flex-col gap-space-md">
      <h3 className="px-5 text-label-lg text-on-surface-variant">Cada semana</h3>
      <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest">
        {WEEKDAYS_FROM_MONDAY.map((weekday) => (
          <WeekdayHours
            key={weekday}
            label={WEEKDAY_LABELS[weekday]}
            hours={draft[weekday]}
            isInvalid={daysToFix.includes(weekday)}
            onChange={(hours) => changeDay(weekday, hours)}
          />
        ))}
      </div>
      <p className="px-1 text-body-md text-on-surface-variant">
        Si ya hay una cita fuera del nuevo horario, se queda en tu agenda.
      </p>
      <div className="grid gap-space-sm sm:grid-cols-2">
        <Button type="submit" variant="primary" icon="check">
          Guardar horario
        </Button>
        <Button icon="close" onClick={onCancel}>
          Volver sin guardar
        </Button>
      </div>
      {hasTriedToSave && daysToFix.length > 0 && (
        <p role="alert" className="rounded-lg bg-error-container p-space-md text-on-error-container">
          {`No se guardó. Revisa ${daysToReview(daysToFix)}.`}
        </p>
      )}
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

const SPANISH_LIST = new Intl.ListFormat('es', { type: 'conjunction' })

// "el lunes y el sábado": names the days instead of pointing at them by color.
function daysToReview(weekdays: Weekday[]): string {
  return SPANISH_LIST.format(weekdays.map((weekday) => `el ${WEEKDAY_LABELS[weekday].toLowerCase()}`))
}

type WeekdayHoursProps = {
  label: string
  hours: HoursDraft
  isInvalid: boolean
  onChange: (hours: HoursDraft) => void
}

// The legend names the group; the visible name is a separate span, because a rendered
// legend cannot sit in a flex row beside the switch.
function WeekdayHours({ label, hours, isInvalid, onChange }: WeekdayHoursProps) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-3 border-t border-separator px-4 py-3 first:border-t-0 @3xl:px-5">
      <legend className="sr-only">{label}</legend>
      <div className="flex min-h-12 items-center justify-between gap-3">
        <span aria-hidden="true" className="text-title-md font-bold text-on-surface">
          {label}
        </span>
        <OpenSwitch isOpen={hours.isOpen} onToggle={() => onChange({ ...hours, isOpen: !hours.isOpen })} />
      </div>
      {hours.isOpen && (
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
      )}
      {isInvalid && (
        <p role="alert" className="rounded-lg bg-error-container p-space-sm text-on-error-container">
          La hora de cierre debe ser después de la apertura.
        </p>
      )}
    </fieldset>
  )
}

type OpenSwitchProps = {
  isOpen: boolean
  onToggle: () => void
}

// WAI-ARIA switch on a button, so the track and knob can be drawn like Apple's.
// The off track uses the outline color: a pale track would vanish on white (WCAG 1.4.11).
function OpenSwitch({ isOpen, onToggle }: OpenSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isOpen}
      aria-label="Abierto"
      onClick={onToggle}
      className="flex min-h-12 items-center gap-3"
    >
      <span aria-hidden="true" className="text-body-md font-semibold text-on-surface-variant">
        {isOpen ? 'Abierto' : 'Cerrado'}
      </span>
      <span
        aria-hidden="true"
        className={`relative h-[31px] w-[51px] rounded-full transition-colors ${isOpen ? 'bg-primary' : 'bg-outline'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-[27px] rounded-full bg-surface-container-lowest shadow-[0_2px_4px_rgb(15_23_42/0.2)] transition-transform motion-reduce:transition-none ${isOpen ? 'translate-x-5' : ''}`}
        />
      </span>
    </button>
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
      <label htmlFor={id} className="text-body-md font-semibold text-on-surface-variant">
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
