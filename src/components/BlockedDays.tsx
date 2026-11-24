import { useId, type ReactNode } from 'react'
import type { CalendarDate } from '../utils/calendar-date'
import { capitalize, formatLongDate } from '../utils/format'

type BlockedDaysProps = {
  // undefined while loading.
  dates: CalendarDate[] | undefined
  // A <LoadError> when the dates failed to load, shown instead of them.
  loadError: ReactNode
  onUnblock: (date: CalendarDate) => void
}

// Blocking lives in the agenda, on the day itself: a button here would leave Mi horario
// and drop any unsaved hours without warning.
export function BlockedDays({ dates, loadError, onUnblock }: BlockedDaysProps) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-space-md rounded-[22px] bg-surface-container-lowest p-6 shadow-card @3xl:w-90 @3xl:shrink-0"
    >
      <div className="flex flex-col gap-1">
        <h3 id={headingId} className="text-headline-md text-on-surface">
          Días que no abres
        </h3>
        <p className="text-body-md text-on-surface-variant">Esos días tus clientes no pueden agendar.</p>
      </div>
      <BlockedDayList dates={dates} loadError={loadError} labelledBy={headingId} onUnblock={onUnblock} />
      <p className="text-body-md text-on-surface-variant">
        Para bloquear un día, ábrelo en la agenda y toca «Bloquear este día».
      </p>
    </section>
  )
}

type BlockedDayListProps = {
  dates: CalendarDate[] | undefined
  loadError: ReactNode
  labelledBy: string
  onUnblock: (date: CalendarDate) => void
}

function BlockedDayList({ dates, loadError, labelledBy, onUnblock }: BlockedDayListProps) {
  if (loadError) return loadError
  if (dates === undefined) return <p className="text-on-surface-variant">Cargando los días…</p>
  if (dates.length === 0) return <p className="text-title-md text-on-surface">No tienes días bloqueados.</p>

  return (
    <ul
      aria-labelledby={labelledBy}
      className="flex flex-col divide-y divide-separator overflow-hidden rounded-lg bg-background"
    >
      {dates.map((date) => (
        <li key={date} className="flex min-h-15 items-center justify-between gap-3 py-2 pr-2 pl-4">
          <span className="text-title-md text-on-surface">{capitalize(formatLongDate(date))}</span>
          <UnblockButton date={date} onUnblock={onUnblock} />
        </li>
      ))}
    </ul>
  )
}

// The name carries the date so a screen reader can tell the "Desbloquear" buttons apart;
// it starts with the visible word (WCAG 2.5.3 Label in Name).
function UnblockButton({ date, onUnblock }: { date: CalendarDate; onUnblock: (date: CalendarDate) => void }) {
  return (
    <button
      type="button"
      aria-label={`Desbloquear el ${formatLongDate(date)}`}
      onClick={() => onUnblock(date)}
      className="min-h-12 shrink-0 rounded-[10px] bg-surface-container-lowest px-4 text-body-md font-bold text-on-surface transition-colors hover:bg-surface-container-high"
    >
      Desbloquear
    </button>
  )
}
