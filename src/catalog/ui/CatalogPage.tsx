import { useState } from 'react'
import { PageFrame } from '../../shared/ui/templates/PageFrame'
import type { CatalogRepository } from '../application/catalog-repository'
import type { Service } from '../domain/service'
import { ServiceFormContainer } from './form/ServiceFormContainer'
import { CatalogListContainer } from './list/CatalogListContainer'

type CatalogPageProps = {
  repository: CatalogRepository
}

type CatalogView = { name: 'list' } | { name: 'form'; service?: Service }

export function CatalogPage({ repository }: CatalogPageProps) {
  const [view, setView] = useState<CatalogView>({ name: 'list' })

  return (
    <PageFrame title="Catálogo">
      {view.name === 'list' ? (
        <CatalogListContainer
          repository={repository}
          onAdd={() => setView({ name: 'form' })}
          onEdit={(service) => setView({ name: 'form', service })}
        />
      ) : (
        <ServiceFormContainer
          repository={repository}
          service={view.service}
          onDone={() => setView({ name: 'list' })}
        />
      )}
    </PageFrame>
  )
}
