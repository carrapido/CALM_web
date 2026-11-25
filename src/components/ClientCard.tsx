import { useState } from 'react'
import { Button } from './Button'
import { ConfirmPanel } from './ConfirmPanel'
import { LoadError } from './LoadError'
import type { ClientHistory } from '../services/clients-repository'
import type { Client } from '../types/client'
import { formatCount } from '../utils/format'
import { formatPhone } from '../utils/format-phone'

export type ClientActions = {
  onGiveAccess: (client: Client) => void
  historyOf: (client: Client) => Promise<ClientHistory>
  // Resolves once she is deleted; rejects with the reason it could not be done.
  onDelete: (client: Client) => Promise<void>
}

type ClientCardProps = {
  client: Client
  actions: ClientActions
}

export function ClientCard({ client, actions }: ClientCardProps) {
  return (
    <article className="flex flex-col gap-space-sm rounded-xl border-2 border-outline-variant bg-surface-container-lowest p-space-md">
      <h3 className="text-headline-sm text-on-surface">{client.name}</h3>
      <p className="text-on-surface">{formatPhone(client.phone)}</p>
      <p className="text-on-surface-variant">
        {client.hasAppAccess ? 'Tiene acceso a la app' : 'Sin acceso a la app'}
      </p>
      {client.hasAppAccess ? (
        <Button icon="password" onClick={() => actions.onGiveAccess(client)} className="sm:self-start">
          Cambiar NIP
        </Button>
      ) : (
        <Button variant="primary" icon="key" onClick={() => actions.onGiveAccess(client)} className="sm:self-start">
          Dar acceso a la app
        </Button>
      )}
      <DeleteClient client={client} actions={actions} />
    </article>
  )
}

type Deletion =
  | { step: 'idle' }
  | { step: 'counting' }
  | { step: 'confirming'; history: ClientHistory }
  | { step: 'deleting' }
  | { step: 'failed'; error: unknown }

// The confirmation names what goes with her, so it waits for her counts first.
function DeleteClient({ client, actions }: ClientCardProps) {
  const [deletion, setDeletion] = useState<Deletion>({ step: 'idle' })

  const countHistory = () => {
    setDeletion({ step: 'counting' })
    actions.historyOf(client).then(
      (history) => setDeletion({ step: 'confirming', history }),
      (error: unknown) => setDeletion({ step: 'failed', error }),
    )
  }

  const deleteClient = () => {
    setDeletion({ step: 'deleting' })
    actions.onDelete(client).catch((error: unknown) => setDeletion({ step: 'failed', error }))
  }

  switch (deletion.step) {
    case 'idle':
      return (
        <Button variant="subtleDanger" icon="person_remove" onClick={countHistory} className="sm:self-start">
          Borrar cliente
        </Button>
      )
    case 'counting':
      return <p className="text-on-surface-variant">Contando sus citas y pedidos…</p>
    case 'confirming':
      return (
        <ConfirmPanel
          question={`¿Borrar a ${client.name}?`}
          detail={deletionDetail(client, deletion.history)}
          confirmLabel="Borrar cliente"
          keepLabel="Conservar cliente"
          onConfirm={deleteClient}
          onKeep={() => setDeletion({ step: 'idle' })}
        />
      )
    case 'deleting':
      return <p className="text-on-surface-variant">Borrando a {client.name}…</p>
    case 'failed':
      return <LoadError error={deletion.error} onRetry={countHistory} />
  }
}

function deletionDetail(client: Client, { appointments, orders }: ClientHistory): string {
  const history = `${formatCount(appointments, 'cita', 'citas')} y ${formatCount(orders, 'pedido', 'pedidos')}`
  const appAccess = client.hasAppAccess ? ', y su acceso a la app' : ''
  return `Se borrarán ${client.name}, ${history} a su nombre${appAccess}. No se puede deshacer.`
}
