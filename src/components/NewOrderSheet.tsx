import { useId, useState, type FormEvent, type ReactNode } from 'react'
import type { Appointment } from '../types/appointment'
import type { CalendarDate } from '../utils/calendar-date'
import { Button } from './Button'
import { FIELD_CONTROL_CLASSES } from '../utils/field-classes'
import { FormField } from './FormField'
import type { OrderDetails } from '../services/register-order'
import { invalidFields, type NewOrderDraft, type NewOrderField } from '../utils/new-order'
import { OrderOrigin } from './OrderOrigin'

type NewOrderSheetProps = {
  // Today's and recent appointments that have no order yet.
  appointments: Appointment[]
  today: CalendarDate
  // The appointment is undefined for a client who came without one.
  onRegister: (details: OrderDetails, appointment: Appointment | undefined) => void
  onCancel: () => void
}

const ERROR_MESSAGES: Record<NewOrderField, string> = {
  clientName: 'Escribe el nombre del cliente',
  whatsapp: 'El WhatsApp debe tener 10 números',
  work: 'Escribe el trabajo a realizar',
  finalPrice: 'Escribe un precio mayor a 0',
  deliveryDate: 'Elige una fecha de entrega de hoy en adelante',
}

// The canvas's sheet, laid out in the page: the admin answers where the order comes
// from, checks the prefilled data and registers it.
export function NewOrderSheet({ appointments, today, onRegister, onCancel }: NewOrderSheetProps) {
  const titleId = useId()
  const [appointment, setAppointment] = useState(appointments.at(0))
  const [draft, setDraft] = useState(() => draftFrom(appointments.at(0)))
  const [fieldsToFix, setFieldsToFix] = useState<NewOrderField[]>([])

  // Another origin brings its own client, so the fields start over from it.
  const chooseOrigin = (chosen: Appointment | undefined) => {
    setAppointment(chosen)
    setDraft(draftFrom(chosen))
    setFieldsToFix([])
  }

  const change = (field: NewOrderField) => (value: string) =>
    setDraft((current) => ({ ...current, [field]: value }))

  const register = (event: FormEvent) => {
    event.preventDefault()
    const invalid = invalidFields(draft, today)
    setFieldsToFix(invalid)
    if (invalid.length === 0) onRegister(toOrderDetails(draft), appointment)
  }

  const errorOf = (field: NewOrderField) =>
    fieldsToFix.includes(field) ? ERROR_MESSAGES[field] : undefined

  return (
    <form
      onSubmit={register}
      noValidate
      aria-labelledby={titleId}
      className="mx-auto mt-space-lg flex w-full max-w-xl flex-col gap-space-lg"
    >
      <div className="flex flex-col items-start gap-space-md">
        <Button icon="chevron_left" onClick={onCancel}>
          Volver sin guardar
        </Button>
        <h2 id={titleId} className="text-headline-lg text-on-surface">
          Nuevo pedido
        </h2>
      </div>
      <OrderOrigin appointments={appointments} today={today} chosen={appointment} onChoose={chooseOrigin} />
      <OrderFields draft={draft} today={today} errorOf={errorOf} change={change} />
      <div className="flex flex-col gap-space-sm">
        <Button type="submit" variant="primary">
          Registrar pedido
        </Button>
        <p className="text-center text-body-md font-semibold text-on-surface-variant">{ticketNote(appointment)}</p>
      </div>
    </form>
  )
}

// From an appointment, the quote prefills the work and its preliminary total the price.
function draftFrom(appointment: Appointment | undefined): NewOrderDraft {
  if (appointment === undefined) {
    return { clientName: '', whatsapp: '', work: '', finalPrice: '', deliveryDate: '' }
  }
  return {
    clientName: appointment.clientName,
    whatsapp: appointment.whatsapp ?? '',
    work: appointment.quote.services.join(', '),
    finalPrice: String(appointment.quote.preliminaryTotalMxn),
    deliveryDate: '',
  }
}

function toOrderDetails(draft: NewOrderDraft): OrderDetails {
  return {
    clientName: draft.clientName.trim(),
    whatsapp: draft.whatsapp === '' ? undefined : draft.whatsapp,
    work: draft.work.trim(),
    finalPriceMxn: Number(draft.finalPrice),
    deliveryDate: draft.deliveryDate,
  }
}

function ticketNote(appointment: Appointment | undefined): string {
  if (appointment === undefined) return 'Se crea un ticket nuevo de 4 números.'
  return `Conserva el ticket ${appointment.ticket} de su cita.`
}

type OrderFieldsProps = {
  draft: NewOrderDraft
  today: CalendarDate
  errorOf: (field: NewOrderField) => string | undefined
  change: (field: NewOrderField) => (value: string) => void
}

// One inset grouped list. Each field keeps its outline border (WCAG 1.4.11), as decided
// for every field in feature 6.
function OrderFields({ draft, today, errorOf, change }: OrderFieldsProps) {
  return (
    <fieldset className="flex flex-col">
      <legend className="px-4 pb-2 text-title-md text-on-surface">Datos del pedido</legend>
      <div className="flex flex-col divide-y divide-separator rounded-xl bg-surface-container-lowest">
        <FieldRow>
          <FormField label="Nombre del cliente" error={errorOf('clientName')}>
            {(props) => (
              <input
                {...props}
                value={draft.clientName}
                onChange={(event) => change('clientName')(event.target.value)}
                className={FIELD_CONTROL_CLASSES}
              />
            )}
          </FormField>
        </FieldRow>
        <FieldRow>
          <FormField label="WhatsApp (opcional)" error={errorOf('whatsapp')}>
            {(props) => (
              <input
                {...props}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={draft.whatsapp}
                onChange={(event) => change('whatsapp')(event.target.value)}
                className={FIELD_CONTROL_CLASSES}
              />
            )}
          </FormField>
        </FieldRow>
        <FieldRow>
          <FormField label="Trabajo a realizar" error={errorOf('work')}>
            {(props) => (
              <textarea
                {...props}
                rows={2}
                value={draft.work}
                onChange={(event) => change('work')(event.target.value)}
                className={`${FIELD_CONTROL_CLASSES} py-space-sm`}
              />
            )}
          </FormField>
        </FieldRow>
        <FieldRow>
          <FormField label="Fecha de entrega" error={errorOf('deliveryDate')}>
            {(props) => (
              <input
                {...props}
                type="date"
                min={today}
                value={draft.deliveryDate}
                onChange={(event) => change('deliveryDate')(event.target.value)}
                className={FIELD_CONTROL_CLASSES}
              />
            )}
          </FormField>
        </FieldRow>
        <FieldRow>
          <FormField label="Precio final" error={errorOf('finalPrice')}>
            {(props) => (
              <div className="flex items-center gap-space-sm">
                <span aria-hidden="true" className="text-title-md text-on-surface-variant">
                  $
                </span>
                <input
                  {...props}
                  inputMode="numeric"
                  value={draft.finalPrice}
                  onChange={(event) => change('finalPrice')(event.target.value)}
                  className={`${FIELD_CONTROL_CLASSES} w-36 text-right font-extrabold tabular-nums`}
                />
                <span className="text-body-md font-bold text-on-surface-variant">MXN</span>
              </div>
            )}
          </FormField>
        </FieldRow>
      </div>
    </fieldset>
  )
}

function FieldRow({ children }: { children: ReactNode }) {
  return <div className="px-4 py-3.5">{children}</div>
}
