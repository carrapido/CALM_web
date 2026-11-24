import { useState } from 'react'
import { PageFrame } from '../components/PageFrame'
import type { ClientsRepository } from '../services/clients-repository'
import type { Client } from '../types/client'
import { EnrollmentFormContainer } from '../components/EnrollmentFormContainer'
import { ClientsListContainer } from '../components/ClientsListContainer'

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
