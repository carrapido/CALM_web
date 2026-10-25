import { useState, type FormEvent } from 'react'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import { Button } from '../../../shared/ui/atoms/Button'
import { FIELD_CONTROL_CLASSES } from '../../../shared/ui/molecules/field-classes'
import { FormField } from '../../../shared/ui/molecules/FormField'
import type { OrderDetails } from '../../application/register-order'
import { invalidFields, type NewOrderDraft, type NewOrderField } from '../../domain/new-order'

type NewOrderFormProps = {
  initialDraft: NewOrderDraft
  today: CalendarDate
  onSave: (details: OrderDetails) => void
  onCancel: () => void
}

const ERROR_MESSAGES: Record<NewOrderField, string> = {
  clientName: 'Escribe el nombre del cliente',
  whatsapp: 'El WhatsApp debe tener 10 números',
  work: 'Escribe el trabajo a realizar',
  finalPrice: 'Escribe un precio mayor a 0',
  deliveryDate: 'Elige una fecha de entrega de hoy en adelante',
}

export function NewOrderForm({ initialDraft, today, onSave, onCancel }: NewOrderFormProps) {
  const [draft, setDraft] = useState(initialDraft)
  const [fieldsToFix, setFieldsToFix] = useState<NewOrderField[]>([])

  const change = (field: NewOrderField) => (value: string) =>
    setDraft((current) => ({ ...current, [field]: value }))

  const save = (event: FormEvent) => {
    event.preventDefault()
    const invalid = invalidFields(draft, today)
    setFieldsToFix(invalid)
    if (invalid.length === 0) onSave(toOrderDetails(draft))
  }

  const errorOf = (field: NewOrderField) =>
    fieldsToFix.includes(field) ? ERROR_MESSAGES[field] : undefined

  return (
    <form onSubmit={save} noValidate className="mt-space-lg flex flex-col gap-space-md">
      <h2 className="text-headline-lg text-on-surface">Datos del pedido</h2>
      <FormField label="Nombre del cliente" error={errorOf('clientName')}>
        {(props) => (
          <input {...props} value={draft.clientName} onChange={(event) => change('clientName')(event.target.value)} className={FIELD_CONTROL_CLASSES} />
        )}
      </FormField>
      <FormField label="WhatsApp (opcional)" error={errorOf('whatsapp')}>
        {(props) => (
          <input {...props} type="tel" inputMode="numeric" maxLength={10} value={draft.whatsapp} onChange={(event) => change('whatsapp')(event.target.value)} className={FIELD_CONTROL_CLASSES} />
        )}
      </FormField>
      <FormField label="Trabajo a realizar" error={errorOf('work')}>
        {(props) => (
          <textarea {...props} rows={3} value={draft.work} onChange={(event) => change('work')(event.target.value)} className={`${FIELD_CONTROL_CLASSES} py-space-sm`} />
        )}
      </FormField>
      <FormField label="Precio final (MXN)" error={errorOf('finalPrice')}>
        {(props) => (
          <input {...props} inputMode="numeric" value={draft.finalPrice} onChange={(event) => change('finalPrice')(event.target.value)} className={FIELD_CONTROL_CLASSES} />
        )}
      </FormField>
      <FormField label="Fecha de entrega" error={errorOf('deliveryDate')}>
        {(props) => (
          <input {...props} type="date" min={today} value={draft.deliveryDate} onChange={(event) => change('deliveryDate')(event.target.value)} className={FIELD_CONTROL_CLASSES} />
        )}
      </FormField>
      <div className="grid gap-space-sm sm:grid-cols-2">
        <Button type="submit" variant="primary" icon="check">
          Guardar pedido
        </Button>
        <Button icon="close" onClick={onCancel}>
          Volver sin guardar
        </Button>
      </div>
    </form>
  )
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
