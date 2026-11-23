import { useState } from 'react'
import { PageFrame } from '../../shared/ui/templates/PageFrame'
import type { ClientsRepository } from '../application/clients-repository'
import type { Client } from '../domain/client'
import { EnrollmentFormContainer } from './form/EnrollmentFormContainer'
import { ClientsListContainer } from './list/ClientsListContainer'

type ClientsPageProps = {
  repository: ClientsRepository
}

type ClientsView = { name: 'list' } | { name: 'form'; client?: Client }

export function ClientsPage({ repository }: ClientsPageProps) {
  const [view, setView] = useState<ClientsView>({ name: 'list' })

  return (
    <PageFrame title="Clientes">
      {view.name === 'list' ? (
        <ClientsListContainer
          repository={repository}
          onAdd={() => setView({ name: 'form' })}
          onGiveAccess={(client) => setView({ name: 'form', client })}
        />
      ) : (
        <EnrollmentFormContainer
          repository={repository}
          client={view.client}
          onDone={() => setView({ name: 'list' })}
        />
      )}
    </PageFrame>
  )
}
