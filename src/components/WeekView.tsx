import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { CalendarDate } from '../utils/calendar-date'
import type { WeekDaySummary } from '../utils/week-agenda'
import { capitalize, formatCount, formatDateRange, formatLongDate } from '../utils/format'

type WeekViewProps = {
  dates: CalendarDate[]
  days: WeekDaySummary[] | undefined
  // A <LoadError> when the week failed to load, shown instead of it.
  loadError: ReactNode
  today: CalendarDate
  onChooseDay: (date: CalendarDate) => void
}

export function WeekView({ dates, days, loadError, today, onChooseDay }: WeekViewProps) {
  return (
    <div className="mt-space-lg flex flex-col gap-space-lg">
      <h2 className="text-headline-lg text-on-surface">
        Semana {formatDateRange(dates[0], dates[dates.length - 1])}
      </h2>
      {loadError ? (
        loadError
      ) : days === undefined ? (
        <p className="text-on-surface-variant">Cargando la semana…</p>
      ) : (
        <ol aria-label="Días de la semana" className="flex flex-col gap-space-sm">
          {days.map((day) => (
            <li key={day.date}>
              <WeekDayButton day={day} isToday={day.date === today} onChoose={onChooseDay} />
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

type WeekDayButtonProps = {
  day: WeekDaySummary
  isToday: boolean
  onChoose: (date: CalendarDate) => void
}

function WeekDayButton({ day, isToday, onChoose }: WeekDayButtonProps) {
  return (
    <button
      type="button"
      onClick={() => onChoose(day.date)}
      className="flex min-h-16 w-full items-center gap-space-md rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-space-md text-left transition-colors hover:border-primary"
    >
      <span className="flex flex-1 flex-wrap items-center gap-space-sm text-title-md text-on-surface">
        {capitalize(formatLongDate(day.date))}
        {isToday && (
          <span className="rounded bg-primary px-space-sm py-space-xs text-label-lg text-on-primary">
            Hoy
          </span>
        )}
      </span>
      <span className="text-on-surface-variant">{daySummary(day)}</span>
      <Icon name="chevron_right" className="text-[24px] text-on-surface-variant" />
    </button>
  )
}

function daySummary({ status, appointmentCount }: WeekDaySummary): string {
  if (status === 'closed') return 'Cerrado'
  if (status === 'blocked') return 'Bloqueado'
  if (appointmentCount === 0) return 'Sin citas'
  return formatCount(appointmentCount, 'cita', 'citas')
}
