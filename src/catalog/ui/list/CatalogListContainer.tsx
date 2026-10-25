import { Button } from '../../../shared/ui/atoms/Button'
import { useQuery } from '../../../shared/ui/useQuery'
import type { CatalogRepository } from '../../application/catalog-repository'
import type { Service } from '../../domain/service'
import { ServiceCard, type ServiceActions } from './ServiceCard'

type CatalogListContainerProps = {
  repository: CatalogRepository
  onAdd: () => void
  onEdit: (service: Service) => void
}

export function CatalogListContainer({ repository, onAdd, onEdit }: CatalogListContainerProps) {
  const { data: services, reload } = useQuery('services', () => repository.services())

  const actions: ServiceActions = {
    onEdit,
    onChangeActive: (service, isActive) =>
      repository.updateService({ ...service, isActive }).then(reload),
    onDelete: (service) => repository.deleteService(service.id).then(reload),
  }

  return (
    <div className="mt-space-lg flex flex-col gap-space-lg">
      <Button variant="primary" icon="add" onClick={onAdd} className="sm:self-start">
        Agregar servicio
      </Button>
      {services === undefined ? (
        <p className="text-on-surface-variant">Cargando el catálogo…</p>
      ) : (
        <ServiceSections services={alphabetical(services)} actions={actions} />
      )}
    </div>
  )
}

function alphabetical(services: Service[]): Service[] {
  return [...services].sort((first, second) => first.name.localeCompare(second.name, 'es-MX'))
}

function ServiceSections({ services, actions }: { services: Service[]; actions: ServiceActions }) {
  const inactive = services.filter((service) => !service.isActive)

  return (
    <>
      <h2 className="text-headline-lg text-on-surface">Servicios activos</h2>
      <ServiceList label="Servicios activos" services={services.filter((service) => service.isActive)} actions={actions} />
      {inactive.length > 0 && (
        <>
          <h2 className="text-headline-lg text-on-surface">Servicios desactivados</h2>
          <p className="text-on-surface-variant">Los clientes no los ven en la app.</p>
          <ServiceList label="Servicios desactivados" services={inactive} actions={actions} />
        </>
      )}
    </>
  )
}

type ServiceListProps = {
  label: string
  services: Service[]
  actions: ServiceActions
}

function ServiceList({ label, services, actions }: ServiceListProps) {
  if (services.length === 0) return <p className="text-on-surface-variant">No hay servicios.</p>

  return (
    <ul aria-label={label} className="grid gap-space-md md:grid-cols-2">
      {services.map((service) => (
        <li key={service.id}>
          <ServiceCard service={service} actions={actions} />
        </li>
      ))}
    </ul>
  )
}
