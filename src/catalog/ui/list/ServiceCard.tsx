import { useState } from 'react'
import { Button } from '../../../shared/ui/atoms/Button'
import { ConfirmPanel } from '../../../shared/ui/molecules/ConfirmPanel'
import { formatPesos } from '../../../shared/ui/format'
import type { Service, ServicePrice } from '../../domain/service'
import { formatEstimatedDays } from '../format-days'

export type ServiceActions = {
  onEdit: (service: Service) => void
  onChangeActive: (service: Service, isActive: boolean) => void
  onDelete: (service: Service) => void
}

type ServiceCardProps = {
  service: Service
  actions: ServiceActions
}

export function ServiceCard({ service, actions }: ServiceCardProps) {
  return (
    <article
      className={`flex flex-col gap-space-sm rounded-xl border-2 p-space-md ${service.isActive ? 'border-primary bg-surface-container-lowest' : 'border-outline-variant bg-surface-container'}`}
    >
      <h3 className="text-headline-sm text-on-surface">{service.name}</h3>
      <p className="text-on-surface">{priceText(service.price)}</p>
      <p className="text-on-surface-variant">
        Tiempo estimado: {formatEstimatedDays(service.estimatedDays)}
      </p>
      {service.isActive ? (
        <ActiveServiceControls service={service} actions={actions} />
      ) : (
        <InactiveServiceControls service={service} actions={actions} />
      )}
    </article>
  )
}

function priceText(price: ServicePrice): string {
  return price.kind === 'base'
    ? `Precio base: ${formatPesos(price.amountMxn)}`
    : 'Precio: se cotiza en el local'
}

function ActiveServiceControls({ service, actions }: ServiceCardProps) {
  const [isConfirmingDeactivate, setIsConfirmingDeactivate] = useState(false)

  if (isConfirmingDeactivate) {
    return (
      <ConfirmPanel
        question={`¿Desactivar ${service.name}? Los clientes ya no lo verán en la app.`}
        confirmLabel="Sí, desactivar"
        keepLabel="No, dejarlo activo"
        onConfirm={() => actions.onChangeActive(service, false)}
        onKeep={() => setIsConfirmingDeactivate(false)}
      />
    )
  }

  return (
    <div className="grid gap-space-sm sm:grid-cols-2">
      <Button variant="primary" icon="edit" onClick={() => actions.onEdit(service)}>
        Editar
      </Button>
      <Button icon="visibility_off" onClick={() => setIsConfirmingDeactivate(true)}>
        Desactivar
      </Button>
    </div>
  )
}

// Deleting is only offered here, after deactivating: two deliberate steps.
function InactiveServiceControls({ service, actions }: ServiceCardProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)

  if (isConfirmingDelete) {
    return (
      <ConfirmPanel
        question={`¿Eliminar ${service.name} para siempre? Esto no se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        keepLabel="No, conservarlo"
        onConfirm={() => actions.onDelete(service)}
        onKeep={() => setIsConfirmingDelete(false)}
      />
    )
  }

  return (
    <div className="grid gap-space-sm sm:grid-cols-2">
      <Button icon="visibility" onClick={() => actions.onChangeActive(service, true)}>
        Activar de nuevo
      </Button>
      <Button icon="delete" onClick={() => setIsConfirmingDelete(true)}>
        Eliminar
      </Button>
    </div>
  )
}
