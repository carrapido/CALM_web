import type { SupabaseClient } from '@supabase/supabase-js'
import type { CatalogRepository } from './catalog-repository'
import type { Database } from '../types/database.types'
import type { Service, ServiceDetails } from '../types/service'
import { newServiceRow, serviceFromRow, serviceRowOf } from './service-rows'

// https://supabase.com/docs/reference/javascript/select
export class SupabaseCatalogRepository implements CatalogRepository {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async services(): Promise<Service[]> {
    const { data, error } = await this.client.from('services').select('*').order('id')
    if (error) throw error
    return data.map((row) => serviceFromRow(row))
  }

  // https://supabase.com/docs/reference/javascript/insert
  async addService(details: ServiceDetails): Promise<Service> {
    const { data, error } = await this.client
      .from('services')
      .insert(newServiceRow(details))
      .select()
      .single()
    if (error) throw error
    return serviceFromRow(data)
  }

  // https://supabase.com/docs/reference/javascript/update
  async updateService(service: Service): Promise<void> {
    const { error } = await this.client
      .from('services')
      .update(serviceRowOf(service))
      .eq('id', Number(service.id))
    if (error) throw error
  }

  // Fails while an appointment still uses the service (appointment_services has no cascade).
  async deleteService(id: string): Promise<void> {
    const { error } = await this.client.from('services').delete().eq('id', Number(id))
    if (error) throw error
  }
}
