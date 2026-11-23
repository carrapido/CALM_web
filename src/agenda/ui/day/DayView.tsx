import { useState } from 'react'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import { PeriodChanger } from '../../../shared/ui/molecules/PeriodChanger'
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
        <PeriodChanger
          label="Cambiar de día"
          previousLabel="Día anterior"
          nextLabel="Día siguiente"
          isCurrent={isToday}
          onPrevious={navigation.onPreviousDay}
          onToday={navigation.onBackToToday}
          onNext={navigation.onNextDay}
        />
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
