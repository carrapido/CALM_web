import type { ApiClient } from './api-client'
import type { CatalogRepository } from './catalog-repository'
import type { Service, ServiceDetails } from '../types/service'

// The catalog through the CALM API (backend/src/routes/service.routes.ts).
export class ApiCatalogRepository implements CatalogRepository {
  private readonly api: ApiClient

  constructor(api: ApiClient) {
    this.api = api
  }

  services(): Promise<Service[]> {
    return this.api.json('GET', '/services')
  }

  addService(details: ServiceDetails): Promise<Service> {
    return this.api.json('POST', '/services', details)
  }

  async updateService({ id, ...changes }: Service): Promise<void> {
    await this.api.send('PUT', `/services/${id}`, changes)
  }

  // The API answers 409 while an appointment still uses the service.
  async deleteService(id: string): Promise<void> {
    await this.api.send('DELETE', `/services/${id}`)
  }
}
