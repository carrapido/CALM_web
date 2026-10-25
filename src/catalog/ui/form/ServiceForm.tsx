import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../shared/ui/atoms/Button'
import { FIELD_CONTROL_CLASSES } from '../../../shared/ui/molecules/field-classes'
import { FormField } from '../../../shared/ui/molecules/FormField'
import type { ServiceDetails, ServicePrice } from '../../domain/service'
import { MAX_ESTIMATED_DAYS, type ServiceDraft, type ServiceProblem } from '../../domain/service-draft'
import { formatEstimatedDays } from '../format-days'

type ServiceFormProps = {
  title: string
  initialDraft: ServiceDraft
  problemsOf: (draft: ServiceDraft) => ServiceProblem[]
  onSave: (details: ServiceDetails) => void
  onCancel: () => void
}

const PROBLEM_MESSAGES: Record<ServiceProblem, string> = {
  missingName: 'Escribe el nombre del servicio',
  nameInUse: 'Ya existe un servicio con ese nombre',
  invalidPrice: 'Escribe un precio mayor a 0',
}

const DAY_OPTIONS = Array.from({ length: MAX_ESTIMATED_DAYS + 1 }, (_, days) => days)

export function ServiceForm({ title, initialDraft, problemsOf, onSave, onCancel }: ServiceFormProps) {
  const [draft, setDraft] = useState(initialDraft)
  const [problems, setProblems] = useState<ServiceProblem[]>([])

  const change =
    <Field extends keyof ServiceDraft>(field: Field) =>
    (value: ServiceDraft[Field]) =>
      setDraft((current) => ({ ...current, [field]: value }))

  const save = (event: FormEvent) => {
    event.preventDefault()
    const found = problemsOf(draft)
    setProblems(found)
    if (found.length === 0) onSave(toServiceDetails(draft))
  }

  const messageFor = (...candidates: ServiceProblem[]) => {
    const problem = candidates.find((candidate) => problems.includes(candidate))
    return problem && PROBLEM_MESSAGES[problem]
  }

  return (
    <form onSubmit={save} noValidate className="mt-space-lg flex flex-col gap-space-md">
      <h2 className="text-headline-lg text-on-surface">{title}</h2>
      <FormField label="Nombre del servicio" error={messageFor('missingName', 'nameInUse')}>
        {(props) => (
          <input {...props} value={draft.name} onChange={(event) => change('name')(event.target.value)} className={FIELD_CONTROL_CLASSES} />
        )}
      </FormField>
      <PriceChoice priceKind={draft.priceKind} onChange={change('priceKind')} />
      {draft.priceKind === 'base' && (
        <FormField label="Precio base (MXN)" error={messageFor('invalidPrice')}>
          {(props) => (
            <input {...props} inputMode="numeric" value={draft.basePrice} onChange={(event) => change('basePrice')(event.target.value)} className={FIELD_CONTROL_CLASSES} />
          )}
        </FormField>
      )}
      <FormField label="Tiempo estimado" error={undefined}>
        {(props) => (
          <select {...props} value={draft.estimatedDays} onChange={(event) => change('estimatedDays')(event.target.value)} className={FIELD_CONTROL_CLASSES}>
            {DAY_OPTIONS.map((days) => (
              <option key={days} value={String(days)}>
                {formatEstimatedDays(days)}
              </option>
            ))}
          </select>
        )}
      </FormField>
      <div className="grid gap-space-sm sm:grid-cols-2">
        <Button type="submit" variant="primary" icon="check">
          Guardar servicio
        </Button>
        <Button icon="close" onClick={onCancel}>
          Volver sin guardar
        </Button>
      </div>
    </form>
  )
}

function toServiceDetails(draft: ServiceDraft): ServiceDetails {
  const price: ServicePrice =
    draft.priceKind === 'base'
      ? { kind: 'base', amountMxn: Number(draft.basePrice) }
      : { kind: 'inStore' }
  return { name: draft.name.trim(), price, estimatedDays: Number(draft.estimatedDays) }
}

const PRICE_OPTIONS: { kind: ServicePrice['kind']; label: string }[] = [
  { kind: 'base', label: 'Tiene precio base' },
  { kind: 'inStore', label: 'Se cotiza en el local' },
]

type PriceChoiceProps = {
  priceKind: ServicePrice['kind']
  onChange: (kind: ServicePrice['kind']) => void
}

// Whole-row labels: the tap target is the full line, not only the small radio dot.
function PriceChoice({ priceKind, onChange }: PriceChoiceProps) {
  const groupName = useId()

  return (
    <fieldset className="flex flex-col gap-space-xs">
      <legend className="mb-space-xs text-title-md text-on-surface">Precio</legend>
      {PRICE_OPTIONS.map(({ kind, label }) => (
        <label
          key={kind}
          className="flex min-h-14 items-center gap-space-sm rounded-lg border-2 border-outline bg-surface-container-lowest px-space-md text-body-lg text-on-surface has-checked:border-primary"
        >
          <input
            type="radio"
            name={groupName}
            checked={priceKind === kind}
            onChange={() => onChange(kind)}
            className="size-6 accent-primary"
          />
          {label}
        </label>
      ))}
    </fieldset>
  )
}
