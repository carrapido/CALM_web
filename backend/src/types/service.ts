// The same JSON shape as the panel's Service type (src/types/service.ts in the frontend).

// Some work can only be priced after seeing the garment.
export type ServicePrice = { kind: 'base'; amountMxn: number } | { kind: 'inStore' }

export type Service = {
  id: string
  name: string
  price: ServicePrice
  // Days until the garment is ready; 0 means the same day.
  estimatedDays: number
  // Only active services reach the client app.
  isActive: boolean
}

export type ServiceDetails = Omit<Service, 'id' | 'isActive'>

export type DeleteOutcome = 'deleted' | 'notFound' | 'inUse'

export interface ServiceRepository {
  all(): Promise<Service[]>
  // A new service starts active.
  add(details: ServiceDetails): Promise<Service>
  // Null when no service has that id.
  update(service: Service): Promise<Service | null>
  remove(id: string): Promise<DeleteOutcome>
}
