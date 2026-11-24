import { Button } from './Button'
import type { Client } from '../types/client'
import { formatPhone } from '../utils/format-phone'

type ClientCardProps = {
  client: Client
  onGiveAccess: (client: Client) => void
}

export function ClientCard({ client, onGiveAccess }: ClientCardProps) {
  return (
    <article className="flex flex-col gap-space-sm rounded-xl border-2 border-outline-variant bg-surface-container-lowest p-space-md">
      <h3 className="text-headline-sm text-on-surface">{client.name}</h3>
      <p className="text-on-surface">{formatPhone(client.phone)}</p>
      <p className="text-on-surface-variant">
        {client.hasAppAccess ? 'Tiene acceso a la app' : 'Sin acceso a la app'}
      </p>
      {client.hasAppAccess ? (
        <Button icon="password" onClick={() => onGiveAccess(client)} className="sm:self-start">
          Cambiar NIP
        </Button>
      ) : (
        <Button variant="primary" icon="key" onClick={() => onGiveAccess(client)} className="sm:self-start">
          Dar acceso a la app
        </Button>
      )}
    </article>
  )
}
