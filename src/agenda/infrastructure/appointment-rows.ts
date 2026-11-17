import type { Appointment } from '../domain/appointment'
import { clockTimeOf } from '../../shared/infrastructure/clock-time'

// One appointment with its client and the names of its services, as the panel selects them.
export type AppointmentRow = {
  ticket: string
  scheduled_date: string
  scheduled_time: string
  preliminary_total_mxn: number
  client: { name: string; phone: string | null }
  appointment_services: { services: { name: string } }[]
}

export function appointmentFromRow(row: AppointmentRow): Appointment {
  return {
    ticket: row.ticket,
    clientName: row.client.name,
    whatsapp: row.client.phone ?? undefined,
    date: row.scheduled_date,
    time: clockTimeOf(row.scheduled_time),
    quote: {
      services: row.appointment_services.map(({ services }) => services.name),
      preliminaryTotalMxn: row.preliminary_total_mxn,
    },
  }
}
