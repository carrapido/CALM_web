import { Button } from '../../../shared/ui/atoms/Button'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import type { DayAgenda, Slot } from '../../domain/day-agenda'
import { capitalize, formatLongDate } from '../../../shared/ui/format'
import { AppointmentCard } from './AppointmentCard'
import { BlockDayControl } from './BlockDayControl'

export type DayNavigation = {
  onPreviousDay: () => void
  onNextDay: () => void
  onBackToToday: () => void
  onShowWeek: () => void
}

export type DayActions = {
  onCancelAppointment: (ticket: string) => void
  onBlockDay: () => void
  onUnblockDay: () => void
}

type DayViewProps = {
  date: CalendarDate
  isToday: boolean
  isPast: boolean
  agenda: DayAgenda | undefined
  navigation: DayNavigation
  actions: DayActions
}

export function DayView({ date, isToday, isPast, agenda, navigation, actions }: DayViewProps) {
  return (
    <div className="mt-space-lg flex flex-col gap-space-lg">
      <h2 className="text-headline-lg text-on-surface">{dayTitle(date, isToday)}</h2>
      <DayNavigationBar isToday={isToday} navigation={navigation} />
      {agenda === undefined ? (
        <p className="text-on-surface-variant">Cargando la agenda…</p>
      ) : (
        <DayBody date={date} isPast={isPast} agenda={agenda} actions={actions} />
      )}
    </div>
  )
}

function dayTitle(date: CalendarDate, isToday: boolean): string {
  const longDate = formatLongDate(date)
  return isToday ? `Hoy, ${longDate}` : capitalize(longDate)
}

function DayNavigationBar({ isToday, navigation }: { isToday: boolean; navigation: DayNavigation }) {
  return (
    <nav aria-label="Cambiar de día" className="grid grid-cols-2 gap-space-sm md:flex">
      <Button icon="chevron_left" onClick={navigation.onPreviousDay}>
        Día anterior
      </Button>
      <Button icon="chevron_right" iconAfter onClick={navigation.onNextDay}>
        Día siguiente
      </Button>
      <Button icon="date_range" onClick={navigation.onShowWeek} className={isToday ? 'col-span-2' : ''}>
        Ver semana
      </Button>
      {!isToday && (
        <Button icon="today" onClick={navigation.onBackToToday}>
          Volver a hoy
        </Button>
      )}
    </nav>
  )
}

type DayBodyProps = {
  date: CalendarDate
  isPast: boolean
  agenda: DayAgenda
  actions: DayActions
}

function DayBody({ date, isPast, agenda, actions }: DayBodyProps) {
  const appointmentCount = agenda.slots.filter((slot) => slot.appointment).length

  return (
    <>
      {agenda.status === 'closed' && <DayNotice>Cerrado</DayNotice>}
      {agenda.status === 'blocked' && (
        <BlockedDay canUnblock={!isPast} onUnblock={actions.onUnblockDay} />
      )}
      {agenda.slots.length > 0 && (
        <SlotList slots={agenda.slots} onCancelAppointment={actions.onCancelAppointment} />
      )}
      {agenda.status === 'open' && !isPast && (
        <BlockDayControl
          key={date}
          date={date}
          appointmentCount={appointmentCount}
          onBlock={actions.onBlockDay}
        />
      )}
    </>
  )
}

function DayNotice({ children }: { children: string }) {
  return (
    <p className="rounded-xl bg-surface-container px-space-md py-space-lg text-center text-headline-md text-on-surface-variant">
      {children}
    </p>
  )
}

function BlockedDay({ canUnblock, onUnblock }: { canUnblock: boolean; onUnblock: () => void }) {
  return (
    <div className="flex flex-col gap-space-sm">
      <DayNotice>Día bloqueado</DayNotice>
      {canUnblock && (
        <Button icon="lock_open" onClick={onUnblock} className="sm:self-center">
          Desbloquear día
        </Button>
      )}
    </div>
  )
}

type SlotListProps = {
  slots: Slot[]
  onCancelAppointment: (ticket: string) => void
}

function SlotList({ slots, onCancelAppointment }: SlotListProps) {
  return (
    <ol aria-label="Horarios del día" className="flex flex-col gap-space-sm">
      {slots.map((slot) => (
        <li key={slot.time}>
          {slot.appointment ? (
            <AppointmentCard
              appointment={slot.appointment}
              canChange={!slot.hasStarted}
              onCancel={onCancelAppointment}
            />
          ) : (
            <FreeSlot time={slot.time} hasStarted={slot.hasStarted} />
          )}
        </li>
      ))}
    </ol>
  )
}

// A free slot that already started can no longer be booked, so it is not "Libre".
function FreeSlot({ time, hasStarted }: { time: string; hasStarted: boolean }) {
  return (
    <div className="flex gap-space-md border-b border-surface-container-highest py-space-sm">
      <time className="w-14 shrink-0 text-title-md tabular-nums text-on-surface">{time}</time>
      <span className="text-on-surface-variant">{hasStarted ? 'Pasado' : 'Libre'}</span>
    </div>
  )
}
