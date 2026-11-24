import { Button } from './Button'
import { useQuery } from '../hooks/useQuery'
import type { ClientsRepository } from '../services/clients-repository'
import type { Client } from '../types/client'
import { ClientCard } from './ClientCard'
import { LoadError } from './LoadError'

type ClientsListContainerProps = {
  repository: ClientsRepository
  onAdd: () => void
  onGiveAccess: (client: Client) => void
}

export function ClientsListContainer({ repository, onAdd, onGiveAccess }: ClientsListContainerProps) {
  const { data: clients, error, reload } = useQuery('clients', () => repository.clients())

  return (
    <div className="mt-space-lg flex flex-col gap-space-lg">
      <Button variant="primary" icon="person_add" onClick={onAdd} className="sm:self-start">
        Dar de alta cliente
      </Button>
      {error !== undefined ? (
        <LoadError error={error} onRetry={reload} />
      ) : clients === undefined ? (
        <p className="text-on-surface-variant">Cargando los clientes…</p>
      ) : (
        <ClientList clients={alphabetical(clients)} onGiveAccess={onGiveAccess} />
      )}
    </div>
  )
}

function alphabetical(clients: Client[]): Client[] {
  return [...clients].sort((first, second) => first.name.localeCompare(second.name, 'es-MX'))
}

type ClientListProps = {
  clients: Client[]
  onGiveAccess: (client: Client) => void
}

function ClientList({ clients, onGiveAccess }: ClientListProps) {
  if (clients.length === 0) return <p className="text-on-surface-variant">No hay clientes.</p>

  return (
    <ul aria-label="Clientes" className="grid gap-space-md md:grid-cols-2">
      {clients.map((client) => (
        <li key={client.id}>
          <ClientCard client={client} onGiveAccess={onGiveAccess} />
        </li>
      ))}
    </ul>
  )
}
