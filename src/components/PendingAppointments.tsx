import type { ReactNode } from 'react'
import type { Appointment } from '../types/appointment'
import { AppointmentRows } from './AppointmentRows'
import type { CalendarDate } from '../utils/calendar-date'

type PendingAppointmentsProps = {
  // undefined while loading.
  appointments: Appointment[] | undefined
  // A <LoadError> when the appointments failed to load, shown instead of them.
  loadError: ReactNode
  today: CalendarDate
}

// The orders screen's "Citas pendientes", read-only as it was there.
export function PendingAppointments({ appointments, loadError, today }: PendingAppointmentsProps) {
  return (
    <section aria-labelledby="pending-appointments-title" className="flex flex-col gap-3">
      <h3 id="pending-appointments-title" className="text-title-md font-bold text-on-surface">
        Citas pendientes
      </h3>
      {loadError ? (
        loadError
      ) : appointments === undefined ? (
        <p className="text-on-surface-variant">Cargando las citas…</p>
      ) : (
        <AppointmentRows appointments={appointments} today={today} />
      )}
    </section>
  )
}
