import type { Service, ServiceDetails, ServiceRepository } from '../src/types/service.js'
import { postgresError } from './postgres-error.js'

// Stands in for the services table, including its unique name and its references.
export class InMemoryServiceRepository implements ServiceRepository {
  private services: Service[]
  private readonly idsInUse: Set<string>
  private nextId = 100

  constructor(services: Service[] = [], idsInUse: string[] = []) {
    this.services = services
    this.idsInUse = new Set(idsInUse)
  }

  async all(): Promise<Service[]> {
    return this.services
  }

  async add(details: ServiceDetails): Promise<Service> {
    this.refuseTakenName(details.name, undefined)
    const service = { ...details, id: String(this.nextId++), isActive: true }
    this.services = [...this.services, service]
    return service
  }

  async update(service: Service): Promise<Service | null> {
    if (!this.services.some((current) => current.id === service.id)) return null
    this.refuseTakenName(service.name, service.id)
    this.services = this.services.map((current) => (current.id === service.id ? service : current))
    return service
  }

  async remove(id: string) {
    if (!this.services.some((service) => service.id === id)) return 'notFound' as const
    if (this.idsInUse.has(id)) return 'inUse' as const
    this.services = this.services.filter((service) => service.id !== id)
    return 'deleted' as const
  }

  private refuseTakenName(name: string, ownId: string | undefined) {
    if (this.services.some((service) => service.name === name && service.id !== ownId)) {
      throw postgresError('23505', 'duplicate key value violates unique constraint "services_name_key"')
    }
  }
}
