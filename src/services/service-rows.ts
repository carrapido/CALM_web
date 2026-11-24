import type { Database } from '../types/database.types'
import type { Service, ServiceDetails, ServicePrice } from '../types/service'

type ServiceRow = Database['public']['Tables']['services']['Row']
type ServiceInsert = Database['public']['Tables']['services']['Insert']
type ServiceUpdate = Database['public']['Tables']['services']['Update']

// The panel has no category yet, and the table requires one.
const DEFAULT_CATEGORY = 'arreglo'

export function serviceFromRow(row: ServiceRow): Service {
  return {
    id: String(row.id),
    name: row.name,
    price: priceFromRow(row.base_price_mxn),
    estimatedDays: row.estimated_days,
    isActive: row.is_active,
  }
}

export function newServiceRow(details: ServiceDetails): ServiceInsert {
  return { ...columnsOf(details), category: DEFAULT_CATEGORY, is_active: true }
}

export function serviceRowOf(service: Service): ServiceUpdate {
  return { ...columnsOf(service), is_active: service.isActive }
}

// An in-store price has no base price in the table.
function columnsOf({ name, price, estimatedDays }: ServiceDetails) {
  return {
    name,
    base_price_mxn: price.kind === 'base' ? price.amountMxn : null,
    estimated_days: estimatedDays,
  }
}

function priceFromRow(basePrice: number | null): ServicePrice {
  return basePrice === null ? { kind: 'inStore' } : { kind: 'base', amountMxn: basePrice }
}
