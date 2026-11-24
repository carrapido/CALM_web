import { useState } from 'react'
import { Button } from './Button'
import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from '../utils/button-classes'
import { Icon } from './Icon'
import { ConfirmPanel } from './ConfirmPanel'
import type { Appointment } from '../types/appointment'
import { formatPesos } from '../utils/format'
import { formatWhatsapp } from '../utils/format-agenda'
import { WHATSAPP_TAB } from '../utils/whatsapp-link'
import { whatsappReminderLink } from '../utils/whatsapp-reminder'

type AppointmentDetailProps = {
  // undefined until the admin chooses an appointment.
  appointment: Appointment | undefined
  // False once the appointment started: there is nothing left to remind or cancel.
  canChange: boolean
  onCancel: (ticket: string) => void
  onClose: () => void
}

// Beside the slots it waits with a hint; on the phone it only shows once an appointment is chosen.
export function AppointmentDetail({ appointment, canChange, onCancel, onClose }: AppointmentDetailProps) {
  return (
    <section
      aria-label="Detalle de la cita"
      className={`flex min-w-0 flex-col gap-space-md @3xl:w-90 @3xl:shrink-0 ${appointment ? '' : '@max-3xl:hidden'}`}
    >
      {appointment ? (
        <ChosenAppointment
          appointment={appointment}
          canChange={canChange}
          onCancel={onCancel}
          onClose={onClose}
        />
      ) : (
        <p className="rounded-xl bg-surface-container-lowest p-6 text-on-surface-variant">
          Elige una cita para ver su detalle.
        </p>
      )}
    </section>
  )
}

type ChosenAppointmentProps = {
  appointment: Appointment
  canChange: boolean
  onCancel: (ticket: string) => void
  onClose: () => void
}

function ChosenAppointment({ appointment, canChange, onCancel, onClose }: ChosenAppointmentProps) {
  return (
    <>
      {/* Visible only when the detail is its own screen; focusing it there scrolls the screen to its top. */}
      <Button icon="chevron_left" onClick={onClose} autoFocus className="self-start @3xl:hidden">
        Volver a la agenda
      </Button>
      <div className="flex flex-col gap-space-md rounded-[22px] bg-surface-container-lowest p-6 shadow-card">
        <AppointmentHeader appointment={appointment} />
        <AppointmentFacts appointment={appointment} />
        {canChange && <ReminderLink appointment={appointment} />}
      </div>
      {canChange && <CancelAppointment appointment={appointment} onCancel={onCancel} />}
    </>
  )
}

function AppointmentHeader({ appointment }: { appointment: Appointment }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-body-md font-bold text-on-surface-variant">Cita de las {appointment.time}</p>
      <h3 className="text-headline-lg text-on-surface">{appointment.clientName}</h3>
      <span className="mt-1 self-start rounded-lg bg-fill px-2.5 py-1 text-body-md font-extrabold tracking-wide tabular-nums text-on-surface">
        Ticket {appointment.ticket}
      </span>
    </div>
  )
}

function AppointmentFacts({ appointment }: { appointment: Appointment }) {
  const { quote, whatsapp } = appointment

  return (
    <dl className="flex flex-col rounded-lg bg-background">
      <div className="flex flex-col gap-0.5 px-4 py-3">
        <dt className="text-label-lg text-on-surface-variant">Trabajo</dt>
        <dd className="text-title-md text-on-surface">{quote.services.join(', ')}</dd>
      </div>
      <Fact term="Cotización preliminar">{formatPesos(quote.preliminaryTotalMxn)}</Fact>
      <Fact term="WhatsApp">{whatsapp ? formatWhatsapp(whatsapp) : 'No dejó número'}</Fact>
    </dl>
  )
}

function Fact({ term, children }: { term: string; children: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-separator px-4 py-3">
      <dt className="text-body-md font-semibold text-on-surface">{term}</dt>
      <dd className="text-title-md font-extrabold tabular-nums text-on-surface">{children}</dd>
    </div>
  )
}

// Without a number there is nothing to send; the facts above already say "No dejó número".
function ReminderLink({ appointment }: { appointment: Appointment }) {
  const href = whatsappReminderLink(appointment)
  if (href === undefined) return null

  return (
    <a
      href={href}
      target={WHATSAPP_TAB}
      rel="noopener noreferrer"
      className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES.primary}`}
    >
      <Icon name="chat" />
      Recordar por WhatsApp
    </a>
  )
}

type CancelAppointmentProps = {
  appointment: Appointment
  onCancel: (ticket: string) => void
}

function CancelAppointment({ appointment, onCancel }: CancelAppointmentProps) {
  const [isConfirming, setIsConfirming] = useState(false)

  if (isConfirming) {
    return (
      <ConfirmPanel
        question={`¿Cancelar la cita de ${appointment.clientName} a las ${appointment.time}?`}
        confirmLabel="Sí, cancelar la cita"
        keepLabel="No, dejarla"
        onConfirm={() => onCancel(appointment.ticket)}
        onKeep={() => setIsConfirming(false)}
      />
    )
  }

  return (
    <Button variant="subtleDanger" icon="event_busy" onClick={() => setIsConfirming(true)}>
      Cancelar cita
    </Button>
  )
}
