import type { Service, ServicePrice } from './service'

// What the admin typed, before it becomes a service.
export type ServiceDraft = {
  name: string
  priceKind: ServicePrice['kind']
  basePrice: string
  estimatedDays: string
}

export type ServiceProblem = 'missingName' | 'nameInUse' | 'invalidPrice'

export const MAX_ESTIMATED_DAYS = 30

// `editingId` is the service being edited, which may keep its own name.
export function serviceProblems(
  draft: ServiceDraft,
  services: Service[],
  editingId: string | undefined,
): ServiceProblem[] {
  const problems: ServiceProblem[] = []
  if (draft.name.trim() === '') problems.push('missingName')
  else if (isNameInUse(draft.name, services, editingId)) problems.push('nameInUse')
  if (draft.priceKind === 'base' && !isValidPrice(draft.basePrice)) problems.push('invalidPrice')
  return problems
}

// "dobladillo de PANTALON" is the same service as "Dobladillo de pantalón".
function isNameInUse(name: string, services: Service[], editingId: string | undefined): boolean {
  return services.some(
    (service) =>
      service.id !== editingId &&
      service.name.localeCompare(name.trim(), 'es-MX', { sensitivity: 'base' }) === 0,
  )
}

function isValidPrice(price: string): boolean {
  return /^\d+$/.test(price) && Number(price) > 0
}
