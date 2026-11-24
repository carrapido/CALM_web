import { useQuery } from '../hooks/useQuery'
import type { CatalogRepository } from '../services/catalog-repository'
import type { Service, ServiceDetails } from '../types/service'
import { serviceProblems, type ServiceDraft } from '../utils/service-draft'
import { LoadError } from './LoadError'
import { ServiceForm } from './ServiceForm'

type ServiceFormContainerProps = {
  repository: CatalogRepository
  // The service being edited; undefined when adding a new one.
  service: Service | undefined
  onDone: () => void
}

const NEW_SERVICE_DRAFT: ServiceDraft = {
  name: '',
  priceKind: 'base',
  basePrice: '',
  estimatedDays: '1',
}

export function ServiceFormContainer({ repository, service, onDone }: ServiceFormContainerProps) {
  // Every service, active or not, so a new name never repeats a deactivated one.
  const { data: services, error, reload } = useQuery('services', () => repository.services())

  const save = (details: ServiceDetails) => {
    const saved = service
      ? repository.updateService({ ...service, ...details })
      : repository.addService(details)
    saved.then(onDone)
  }

  if (error !== undefined) return <LoadError error={error} onRetry={reload} className="mt-space-lg" />
  if (services === undefined) return <p className="mt-space-lg text-on-surface-variant">Cargando…</p>
  return (
    <ServiceForm
      title={service ? 'Editar servicio' : 'Nuevo servicio'}
      initialDraft={service ? draftFrom(service) : NEW_SERVICE_DRAFT}
      problemsOf={(draft) => serviceProblems(draft, services, service?.id)}
      onSave={save}
      onCancel={onDone}
    />
  )
}

function draftFrom(service: Service): ServiceDraft {
  return {
    name: service.name,
    priceKind: service.price.kind,
    basePrice: service.price.kind === 'base' ? String(service.price.amountMxn) : '',
    estimatedDays: String(service.estimatedDays),
  }
}
