import type { Appointment } from '../../agenda/domain/appointment'
import { AppointmentRows } from '../../orders/ui/list/AppointmentRows'
import type { CalendarDate } from '../../shared/domain/calendar-date'

type PendingAppointmentsProps = {
  // undefined while loading.
  appointments: Appointment[] | undefined
  today: CalendarDate
}

// The orders screen's "Citas pendientes", read-only as it was there.
export function PendingAppointments({ appointments, today }: PendingAppointmentsProps) {
  return (
    <section aria-labelledby="pending-appointments-title" className="flex flex-col gap-3">
      <h3 id="pending-appointments-title" className="text-title-md font-bold text-on-surface">
        Citas pendientes
      </h3>
      {appointments === undefined ? (
        <p className="text-on-surface-variant">Cargando las citas…</p>
      ) : (
        <AppointmentRows appointments={appointments} today={today} />
      )}
    </section>
  )
}
