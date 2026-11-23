import { Button } from '../../../shared/ui/atoms/Button'
import { useQuery } from '../../../shared/ui/useQuery'
import type { ClientsRepository } from '../../application/clients-repository'
import type { Client } from '../../domain/client'
import { ClientCard } from './ClientCard'

type ClientsListContainerProps = {
  repository: ClientsRepository
  onAdd: () => void
  onGiveAccess: (client: Client) => void
}

export function ClientsListContainer({ repository, onAdd, onGiveAccess }: ClientsListContainerProps) {
  const { data: clients } = useQuery('clients', () => repository.clients())

  return (
    <div className="mt-space-lg flex flex-col gap-space-lg">
      <Button variant="primary" icon="person_add" onClick={onAdd} className="sm:self-start">
        Dar de alta cliente
      </Button>
      {clients === undefined ? (
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
