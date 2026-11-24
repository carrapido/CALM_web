import type { Appointment } from '../types/appointment'
import type { CalendarDate } from '../utils/calendar-date'
import { capitalize, formatLongDate, formatPesos } from '../utils/format'

type AppointmentRowsProps = {
  appointments: Appointment[]
  today: CalendarDate
}

// Appointments whose clothes have not reached the workshop yet; they become orders from
// "Nuevo pedido" when the client arrives.
export function AppointmentRows({ appointments, today }: AppointmentRowsProps) {
  if (appointments.length === 0) {
    return (
      <p className="rounded-xl bg-surface-container-lowest p-6 text-title-md text-on-surface">
        No hay citas pendientes.
      </p>
    )
  }
  return (
    <ol aria-label="Citas pendientes" className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest">
      {appointments.map((appointment) => (
        <li
          key={`${appointment.ticket}-${appointment.date}-${appointment.time}`}
          className="flex min-h-21 flex-col gap-1.5 border-t border-separator px-5 py-4 first:border-t-0 @3xl:flex-row @3xl:items-center @3xl:gap-3.5"
        >
          <span className="flex min-w-0 flex-col gap-0.5 @3xl:flex-1">
            <span className="text-body-md font-bold tabular-nums text-on-surface-variant">
              Ticket {appointment.ticket} · {appointment.clientName}
            </span>
            <span className="text-title-md font-bold text-on-surface">{appointment.quote.services.join(', ')}</span>
            <span className="text-body-md text-on-surface-variant">{whenOf(appointment, today)}</span>
          </span>
          <span className="shrink-0 text-body-md font-bold tabular-nums text-on-surface">
            {formatPesos(appointment.quote.preliminaryTotalMxn)}
          </span>
        </li>
      ))}
    </ol>
  )
}

// "Hoy, 10:30" or "Lunes 26 de octubre, 10:00".
function whenOf({ date, time }: Appointment, today: CalendarDate): string {
  const day = date === today ? 'Hoy' : capitalize(formatLongDate(date))
  return `${day}, ${time}`
}
