import type { Service, ServiceDetails } from '../types/service'

// Port: the CALM API in the running app, in memory in tests.
export interface CatalogRepository {
  services(): Promise<Service[]>
  // The store assigns the id; a new service starts active.
  addService(details: ServiceDetails): Promise<Service>
  updateService(service: Service): Promise<void>
  // Permanent. A real API should delete logically, since saved quotes point to services.
  deleteService(id: string): Promise<void>
}
