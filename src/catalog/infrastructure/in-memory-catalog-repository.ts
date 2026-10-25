import type { CatalogRepository } from '../application/catalog-repository'
import type { Service, ServiceDetails } from '../domain/service'

export class InMemoryCatalogRepository implements CatalogRepository {
  private serviceList: Service[]
  // A counter, not crypto.randomUUID(): that needs a secure context, which a phone
  // opening the dev server by LAN IP over http does not have.
  private nextId = 1

  constructor(services: Service[]) {
    this.serviceList = services
  }

  async services(): Promise<Service[]> {
    return this.serviceList
  }

  async addService(details: ServiceDetails): Promise<Service> {
    const service = { ...details, id: `new-service-${this.nextId++}`, isActive: true }
    this.serviceList = [...this.serviceList, service]
    return service
  }

  async updateService(service: Service): Promise<void> {
    this.serviceList = this.serviceList.map((current) =>
      current.id === service.id ? service : current,
    )
  }

  async deleteService(id: string): Promise<void> {
    this.serviceList = this.serviceList.filter((service) => service.id !== id)
  }
}
