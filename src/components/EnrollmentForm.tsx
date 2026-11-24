import { useState, type FormEvent } from 'react'
import { Button } from './Button'
import { FIELD_CONTROL_CLASSES } from '../utils/field-classes'
import { FormField } from './FormField'
import type { EnrollmentField } from '../services/clients-repository'
import { NIP_LENGTH, type EnrollmentDraft, type EnrollmentProblem } from '../utils/enrollment'

// Why the server did not save, ready to show; beside `field` when the form shows it.
export type ServerRefusal = {
  message: string
  field: EnrollmentField | undefined
}

type EnrollmentFormProps = {
  title: string
  saveLabel: string
  // Only a new client needs a name; an existing one keeps hers.
  asksForName: boolean
  initialDraft: EnrollmentDraft
  problemsOf: (draft: EnrollmentDraft) => EnrollmentProblem[]
  isSaving: boolean
  refusal: ServerRefusal | undefined
  onSave: (draft: EnrollmentDraft) => void
  onCancel: () => void
}

const PROBLEM_MESSAGES: Record<EnrollmentProblem, string> = {
  missingName: 'Escribe el nombre del cliente.',
  invalidPhone: 'Escribe el celular a 10 dígitos.',
  invalidNip: 'El NIP necesita 4 dígitos.',
}

const FIELD_PROBLEMS: Record<EnrollmentField, EnrollmentProblem> = {
  name: 'missingName',
  phone: 'invalidPhone',
  nip: 'invalidNip',
}

export function EnrollmentForm({
  title,
  saveLabel,
  asksForName,
  initialDraft,
  problemsOf,
  isSaving,
  refusal,
  onSave,
  onCancel,
}: EnrollmentFormProps) {
  const [draft, setDraft] = useState(initialDraft)
  const [problems, setProblems] = useState<EnrollmentProblem[]>([])

  const change = (field: keyof EnrollmentDraft) => (value: string) =>
    setDraft((current) => ({ ...current, [field]: value }))

  const save = (event: FormEvent) => {
    event.preventDefault()
    const found = problemsOf(draft)
    setProblems(found)
    if (found.length === 0) onSave(draft)
  }

  const isRefusalBeside = (field: EnrollmentField) =>
    refusal?.field === field && (field !== 'name' || asksForName)

  // The form's own check comes first; the server's refusal shows once the field passes it.
  const messageFor = (field: EnrollmentField) => {
    const problem = FIELD_PROBLEMS[field]
    if (problems.includes(problem)) return PROBLEM_MESSAGES[problem]
    return isRefusalBeside(field) ? refusal?.message : undefined
  }

  const generalRefusal =
    refusal && !(refusal.field && isRefusalBeside(refusal.field)) ? refusal.message : undefined

  return (
    <form onSubmit={save} noValidate className="mt-space-lg flex flex-col gap-space-md">
      <h2 className="text-headline-lg text-on-surface">{title}</h2>
      {asksForName && (
        <FormField label="Nombre" error={messageFor('name')}>
          {(props) => (
            <input {...props} autoComplete="off" value={draft.name} onChange={(event) => change('name')(event.target.value)} className={FIELD_CONTROL_CLASSES} />
          )}
        </FormField>
      )}
      <FormField label="Celular" error={messageFor('phone')}>
        {(props) => (
          <input {...props} type="tel" inputMode="numeric" autoComplete="off" value={draft.phone} onChange={(event) => change('phone')(event.target.value)} className={FIELD_CONTROL_CLASSES} />
        )}
      </FormField>
      {/* The client dictates it at the counter; password type keeps it off the screen. */}
      <FormField label="NIP" error={messageFor('nip')}>
        {(props) => (
          <input {...props} type="password" inputMode="numeric" autoComplete="off" maxLength={NIP_LENGTH} value={draft.nip} onChange={(event) => change('nip')(nipDigits(event.target.value))} className={FIELD_CONTROL_CLASSES} />
        )}
      </FormField>
      {generalRefusal && (
        <p role="alert" className="rounded-lg bg-error-container p-space-md text-on-error-container">
          {generalRefusal}
        </p>
      )}
      <div className="grid gap-space-sm sm:grid-cols-2">
        <Button type="submit" variant="primary" icon="check" disabled={isSaving} className="disabled:cursor-wait disabled:opacity-70">
          {saveLabel}
        </Button>
        <Button icon="close" onClick={onCancel}>
          Volver sin guardar
        </Button>
      </div>
    </form>
  )
}

function nipDigits(value: string): string {
  return value.replaceAll(/\D/g, '').slice(0, NIP_LENGTH)
}
