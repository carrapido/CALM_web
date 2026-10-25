import { formatLongDate } from '../../../shared/ui/format'
import { whatsappChatLink } from '../../../shared/ui/whatsapp-link'
import type { Appointment } from '../../domain/appointment'

export function whatsappReminderLink(appointment: Appointment): string | undefined {
  if (appointment.whatsapp === undefined) return undefined
  return whatsappChatLink(appointment.whatsapp, reminderText(appointment))
}

function reminderText({ clientName, date, time, ticket }: Appointment): string {
  return `Hola ${clientName}, te recuerdo tu cita en Costurando a la medida el ${formatLongDate(date)} a las ${time}. Tu ticket es ${ticket}.`
}
