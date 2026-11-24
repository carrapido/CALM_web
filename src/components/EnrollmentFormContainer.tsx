import { useState } from 'react'
import type { ClientsRepository, EnrollmentOutcome } from '../services/clients-repository'
import type { Client } from '../types/client'
import {
  enrollmentFrom,
  enrollmentProblems,
  type EnrollmentDraft,
} from '../utils/enrollment'
import { EnrollmentForm, type ServerRefusal } from './EnrollmentForm'

type EnrollmentFormContainerProps = {
  repository: ClientsRepository
  // The client getting access; undefined when registering a new one.
  client: Client | undefined
  onDone: () => void
}

const UNAVAILABLE_MESSAGE = 'No pudimos guardar. Revisa tu internet e inténtalo de nuevo.'

export function EnrollmentFormContainer({ repository, client, onDone }: EnrollmentFormContainerProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [refusal, setRefusal] = useState<ServerRefusal>()

  // The NIP only lives in the form's draft, which goes away with the form after a save.
  const save = (draft: EnrollmentDraft) => {
    setIsSaving(true)
    setRefusal(undefined)
    repository
      .enroll(enrollmentFrom(draft, client?.id))
      .catch((): EnrollmentOutcome => ({ kind: 'unavailable' }))
      .then((outcome) => {
        if (outcome.kind === 'saved') {
          onDone()
          return
        }
        setIsSaving(false)
        setRefusal(
          outcome.kind === 'refused'
            ? { message: outcome.message, field: outcome.field }
            : { message: UNAVAILABLE_MESSAGE, field: undefined },
        )
      })
  }

  return (
    <EnrollmentForm
      title={client ? client.name : 'Nuevo cliente'}
      saveLabel={client ? 'Guardar acceso' : 'Dar de alta'}
      asksForName={client === undefined}
      initialDraft={{ name: '', phone: client?.phone ?? '', nip: '' }}
      problemsOf={(draft) => enrollmentProblems(draft, client === undefined)}
      isSaving={isSaving}
      refusal={refusal}
      onSave={save}
      onCancel={onDone}
    />
  )
}
