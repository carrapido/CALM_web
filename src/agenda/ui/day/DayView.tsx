import { useState, type ReactNode } from 'react'
import { Icon } from '../../../shared/ui/atoms/Icon'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import type { Appointment } from '../../domain/appointment'
import type { DayAgenda } from '../../domain/day-agenda'
import { formatDayLabel } from '../../../shared/ui/format'
import { AppointmentDetail } from './AppointmentDetail'
import { DaySlots } from './DaySlots'

export type DayNavigation = {
  onPreviousDay: () => void
  onNextDay: () => void
  onBackToToday: () => void
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
  // "HH:MM" in Cancún, for the "Ahora" line of today.
  currentTime: string
  agenda: DayAgenda | undefined
  navigation: DayNavigation
  actions: DayActions
}

// The day's slots beside the chosen appointment's detail. Below the split width (the
// @container's @3xl) the detail is a screen of its own: the day's controls step aside.
export function DayView({ date, isToday, isPast, currentTime, agenda, navigation, actions }: DayViewProps) {
  const [chosenTicket, setChosenTicket] = useState<string>()
  const chosen = agenda && appointmentWithTicket(agenda, chosenTicket)
  const hiddenBesideDetail = chosen ? '@max-3xl:hidden' : ''

  return (
    <div className="@container mt-space-lg flex flex-col gap-space-lg">
      <div className={`flex flex-wrap items-center justify-between gap-space-md ${hiddenBesideDetail}`}>
        <h2 className="text-headline-lg text-on-surface">{formatDayLabel(date, isToday)}</h2>
        <DayChanger isToday={isToday} navigation={navigation} />
      </div>
      {agenda === undefined ? (
        <p className="text-on-surface-variant">Cargando la agenda…</p>
      ) : (
        <div className="flex flex-col gap-7 @3xl:flex-row @3xl:items-start">
          <DaySlots
            date={date}
            isToday={isToday}
            isPast={isPast}
            currentTime={currentTime}
            agenda={agenda}
            chosenTicket={chosen?.ticket}
            onChoose={setChosenTicket}
            actions={actions}
            className={hiddenBesideDetail}
          />
          {hasAppointments(agenda) && (
            <AppointmentDetail
              key={chosen?.ticket}
              appointment={chosen}
              canChange={chosen !== undefined && !hasStarted(agenda, chosen)}
              onCancel={actions.onCancelAppointment}
              onClose={() => setChosenTicket(undefined)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function appointmentWithTicket(agenda: DayAgenda, ticket: string | undefined): Appointment | undefined {
  return agenda.slots.find((slot) => slot.appointment?.ticket === ticket)?.appointment
}

function hasAppointments(agenda: DayAgenda): boolean {
  return agenda.slots.some((slot) => slot.appointment)
}

function hasStarted(agenda: DayAgenda, appointment: Appointment): boolean {
  return agenda.slots.some((slot) => slot.appointment === appointment && slot.hasStarted)
}

// "Hoy" stays in place and is only switched off on today, so the admin always finds it.
function DayChanger({ isToday, navigation }: { isToday: boolean; navigation: DayNavigation }) {
  return (
    <div
      role="group"
      aria-label="Cambiar de día"
      className="flex w-full shrink-0 items-stretch rounded-lg bg-surface-container-lowest shadow-[0_0_0_1px_var(--color-separator)] @2xl:w-auto"
    >
      <ChangerButton onClick={navigation.onPreviousDay}>
        <Icon name="chevron_left" />
        Día anterior
      </ChangerButton>
      <ChangerDivider />
      <ChangerButton onClick={navigation.onBackToToday} disabled={isToday}>
        Hoy
      </ChangerButton>
      <ChangerDivider />
      <ChangerButton onClick={navigation.onNextDay}>
        Día siguiente
        <Icon name="chevron_right" />
      </ChangerButton>
    </div>
  )
}

type ChangerButtonProps = {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

function ChangerButton({ onClick, disabled = false, children }: ChangerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 flex-1 items-center justify-center gap-0.5 px-3 text-body-lg font-semibold whitespace-nowrap text-on-surface transition-colors hover:bg-fill disabled:text-outline disabled:hover:bg-transparent @2xl:flex-none @2xl:px-4"
    >
      {children}
    </button>
  )
}

function ChangerDivider() {
  return <span aria-hidden="true" className="my-2.5 w-px bg-fill-strong" />
}
