import { useState } from 'react'
import { Button } from '../../../shared/ui/atoms/Button'
import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from '../../../shared/ui/atoms/button-classes'
import { Icon } from '../../../shared/ui/atoms/Icon'
import { ConfirmPanel } from '../../../shared/ui/molecules/ConfirmPanel'
import type { Appointment } from '../../domain/appointment'
import { formatPesos } from '../../../shared/ui/format'
import { whatsappReminderLink } from './whatsapp-reminder'

type AppointmentCardProps = {
  appointment: Appointment
  // False once the appointment started: there is nothing left to remind or cancel.
  canChange: boolean
  onCancel: (ticket: string) => void
}

export function AppointmentCard({ appointment, canChange, onCancel }: AppointmentCardProps) {
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false)

  return (
    <article className="flex flex-col gap-space-sm rounded-xl border-2 border-primary bg-surface-container-lowest p-space-md">
      <AppointmentDetails appointment={appointment} />
      {canChange && isConfirmingCancel && (
        <ConfirmPanel
          question={`¿Cancelar la cita de ${appointment.clientName} a las ${appointment.time}?`}
          confirmLabel="Sí, cancelar la cita"
          keepLabel="No, dejarla"
          onConfirm={() => onCancel(appointment.ticket)}
          onKeep={() => setIsConfirmingCancel(false)}
        />
      )}
      {canChange && !isConfirmingCancel && (
        <div className="grid gap-space-sm sm:grid-cols-2">
          <ReminderLink appointment={appointment} />
          <Button icon="event_busy" onClick={() => setIsConfirmingCancel(true)}>
            Cancelar cita
          </Button>
        </div>
      )}
    </article>
  )
}

// The time leads the card, level with the "10:00 Libre" rows, so no column is left empty.
function AppointmentDetails({ appointment }: { appointment: Appointment }) {
  const { time, clientName, ticket, quote } = appointment

  return (
    <>
      <div className="flex items-center justify-between gap-space-sm">
        <time className="text-title-md tabular-nums text-on-surface">{time}</time>
        <span className="rounded bg-secondary-container px-space-sm py-space-xs text-title-md tabular-nums text-on-secondary-fixed">
          Ticket {ticket}
        </span>
      </div>
      <h3 className="text-headline-sm text-on-surface">{clientName}</h3>
      <p className="text-on-surface">{quote.services.join(', ')}</p>
      <p className="text-on-surface-variant">
        Cotización preliminar: {formatPesos(quote.preliminaryTotalMxn)}
      </p>
    </>
  )
}

function ReminderLink({ appointment }: { appointment: Appointment }) {
  const href = whatsappReminderLink(appointment)
  if (href === undefined) {
    return <p className="flex min-h-14 items-center text-on-surface-variant">Sin WhatsApp</p>
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.primary}`}
    >
      <Icon name="chat" className="text-[24px]" />
      Recordar por WhatsApp
    </a>
  )
}
