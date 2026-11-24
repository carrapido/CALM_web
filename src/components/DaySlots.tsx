import { useId } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import type { CalendarDate } from '../utils/calendar-date'
import type { Appointment } from '../types/appointment'
import type { DayAgenda, Slot } from '../utils/day-agenda'
import { formatLongDate, formatPesos } from '../utils/format'
import { BlockDayControl } from './BlockDayControl'
import type { DayActions } from './DayView'

type DaySlotsProps = {
  date: CalendarDate
  isToday: boolean
  isPast: boolean
  currentTime: string
  agenda: DayAgenda
  chosenTicket: string | undefined
  onChoose: (ticket: string) => void
  actions: DayActions
  className: string
}

// Slots that already started go before the "Ahora" line, the rest after it: the
// heading says a slot is past, so every free slot simply reads "Libre".
export function DaySlots({
  date,
  isToday,
  isPast,
  currentTime,
  agenda,
  chosenTicket,
  onChoose,
  actions,
  className,
}: DaySlotsProps) {
  const started = agenda.slots.filter((slot) => slot.hasStarted)
  const upcoming = agenda.slots.filter((slot) => !slot.hasStarted)
  const rowState = {
    chosenTicket,
    nextTicket: isToday ? firstAppointment(upcoming)?.ticket : undefined,
    onChoose,
  }

  return (
    <section
      aria-label="Horarios del día"
      className={`flex min-w-0 flex-col gap-space-md @3xl:flex-1 ${className}`}
    >
      <DayNotice date={date} status={agenda.status} canUnblock={!isPast} onUnblock={actions.onUnblockDay} />
      <SlotGroup title="Antes de ahora" slots={started} rowState={rowState} />
      {isToday && agenda.slots.length > 0 && <NowLine time={currentTime} />}
      <SlotGroup title="Más tarde" slots={upcoming} rowState={rowState} />
      {agenda.status === 'open' && !isPast && (
        <BlockDayControl
          date={date}
          appointmentCount={agenda.slots.filter((slot) => slot.appointment).length}
          onBlock={actions.onBlockDay}
        />
      )}
    </section>
  )
}

function firstAppointment(slots: Slot[]): Appointment | undefined {
  return slots.find((slot) => slot.appointment)?.appointment
}

type DayNoticeProps = {
  date: CalendarDate
  status: DayAgenda['status']
  canUnblock: boolean
  onUnblock: () => void
}

function DayNotice({ date, status, canUnblock, onUnblock }: DayNoticeProps) {
  if (status === 'open') return null
  if (status === 'closed') {
    return (
      <p className="rounded-xl bg-surface-container-lowest px-5 py-6 text-center text-headline-md text-on-surface-variant">
        Cerrado
      </p>
    )
  }

  return (
    <div className="flex flex-col items-center gap-space-sm rounded-[22px] bg-surface-container-lowest px-6 py-8 text-center shadow-card">
      <span className="flex size-14 items-center justify-center rounded-full bg-fill text-on-surface">
        <Icon name="lock" />
      </span>
      <h3 className="text-headline-md text-on-surface">Día bloqueado</h3>
      {/* A past blocked day can no longer be opened, so it only keeps the heading. */}
      {canUnblock && (
        <>
          <p className="text-on-surface-variant">{`Tus clientes no pueden agendar el ${formatLongDate(date)}.`}</p>
          <Button icon="lock_open" onClick={onUnblock}>
            Desbloquear día
          </Button>
        </>
      )}
    </div>
  )
}

type RowState = {
  chosenTicket: string | undefined
  // The first appointment of today that has not started.
  nextTicket: string | undefined
  onChoose: (ticket: string) => void
}

type SlotGroupProps = {
  title: string
  slots: Slot[]
  rowState: RowState
}

// An inset grouped list, named by its heading.
function SlotGroup({ title, slots, rowState }: SlotGroupProps) {
  const headingId = useId()
  if (slots.length === 0) return null

  return (
    <div className="flex flex-col gap-space-sm">
      <h3 id={headingId} className="px-5 text-label-lg text-on-surface-variant">
        {title}
      </h3>
      <ol aria-labelledby={headingId} className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest">
        {slots.map((slot) => (
          <li key={slot.time} className="border-t border-separator first:border-t-0">
            {slot.appointment ? (
              <AppointmentRow time={slot.time} appointment={slot.appointment} rowState={rowState} />
            ) : (
              <FreeSlot time={slot.time} />
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

// Narrower on the phone, like the canvas, so the client's details keep the width.
const ROW_SPACING_CLASSES = 'gap-3 px-4 @3xl:gap-space-md @3xl:px-5'
const TIME_COLUMN_CLASSES = 'w-12 shrink-0 @3xl:w-16'

function FreeSlot({ time }: { time: string }) {
  return (
    <div className={`flex min-h-13 items-center py-3 ${ROW_SPACING_CLASSES}`}>
      <time className={`text-title-md font-bold tabular-nums text-on-surface-variant ${TIME_COLUMN_CLASSES}`}>
        {time}
      </time>
      <span className="font-medium text-on-surface-variant">Libre</span>
    </div>
  )
}

type AppointmentRowProps = {
  time: string
  appointment: Appointment
  rowState: RowState
}

function AppointmentRow({ time, appointment, rowState }: AppointmentRowProps) {
  const { ticket, clientName, quote } = appointment
  const isChosen = ticket === rowState.chosenTicket
  const chosenClasses = isChosen ? 'bg-surface-container-low shadow-[inset_0_0_0_2px_var(--color-primary)]' : ''

  return (
    <button
      type="button"
      aria-current={isChosen ? 'true' : undefined}
      onClick={() => rowState.onChoose(ticket)}
      className={`flex w-full items-start py-4 text-left transition-colors hover:bg-surface-container-low ${ROW_SPACING_CLASSES} ${chosenClasses}`}
    >
      <time className={`text-title-md font-extrabold tabular-nums text-on-surface ${TIME_COLUMN_CLASSES}`}>
        {time}
      </time>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-title-md font-bold text-on-surface">{clientName}</span>
        <span className="text-body-md font-medium text-on-surface-variant">{quote.services.join(', ')}</span>
        <span className="text-body-md font-semibold tabular-nums text-on-surface-variant">
          Ticket {ticket} · Cotización{' '}
          <span className="whitespace-nowrap">{formatPesos(quote.preliminaryTotalMxn)}</span>
        </span>
        {ticket === rowState.nextTicket && (
          <span className="mt-1 self-start rounded-full bg-fill px-2.5 py-1 text-label-lg font-extrabold text-on-surface">
            Próxima
          </span>
        )}
      </span>
      {/* On the phone the row opens its own screen, so it carries the disclosure chevron.
          The wrapper hides it: Google's unlayered icon CSS would override a hidden class on the glyph. */}
      <span className="self-center text-on-surface-variant @3xl:hidden">
        <Icon name="chevron_right" />
      </span>
    </button>
  )
}

function NowLine({ time }: { time: string }) {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <span aria-hidden="true" className="size-2.5 rounded-full bg-now" />
      <p className="text-body-md font-extrabold tabular-nums text-now">Ahora · {time}</p>
      <span aria-hidden="true" className="h-0.5 flex-1 rounded-full bg-now" />
    </div>
  )
}
