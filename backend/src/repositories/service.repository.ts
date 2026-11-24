import { DatabaseError, type Pool } from 'pg'
import type {
  DeleteOutcome, Service, ServiceDetails, ServicePrice, ServiceRepository,
} from '../types/service.js'

// node-postgres reads bigint as a string, which is the id type the panel uses.
type ServiceRow = {
  id: string
  name: string
  base_price_mxn: number | null
  estimated_days: number
  is_active: boolean
}

const COLUMNS = 'id, name, base_price_mxn, estimated_days, is_active'

// Every value goes in as a $n parameter; only the fixed COLUMNS list is part of the text.
// safe-anything:ignore
const INSERT_SERVICE = `insert into services (name, category, base_price_mxn, estimated_days, is_active)
  values ($1, $2, $3, $4, true)
  returning ${COLUMNS}`

// safe-anything:ignore
const UPDATE_SERVICE = `update services
  set name = $1, base_price_mxn = $2, estimated_days = $3, is_active = $4
  where id = $5
  returning ${COLUMNS}`

// The panel has no category yet, and the table requires one.
const DEFAULT_CATEGORY = 'arreglo'
const FOREIGN_KEY_VIOLATION = '23503'

export function serviceRepository(pool: Pool): ServiceRepository {
  return {
    async all() {
      const { rows } = await pool.query<ServiceRow>(`select ${COLUMNS} from services order by id`)
      return rows.map(serviceFromRow)
    },

    async add(details) {
      const { rows } = await pool.query<ServiceRow>(
        INSERT_SERVICE,
        [details.name, DEFAULT_CATEGORY, basePriceOf(details), details.estimatedDays],
      )
      return serviceFromRow(onlyRow(rows))
    },

    async update(service) {
      const { rows } = await pool.query<ServiceRow>(
        UPDATE_SERVICE,
        [service.name, basePriceOf(service), service.estimatedDays, service.isActive, service.id],
      )
      return rows[0] === undefined ? null : serviceFromRow(rows[0])
    },

    // Fails while an appointment still uses the service (appointment_services has no cascade).
    async remove(id): Promise<DeleteOutcome> {
      try {
        const { rowCount } = await pool.query('delete from services where id = $1', [id])
        return rowCount === 0 ? 'notFound' : 'deleted'
      } catch (error) {
        if (error instanceof DatabaseError && error.code === FOREIGN_KEY_VIOLATION) return 'inUse'
        throw error
      }
    },
  }
}

function serviceFromRow(row: ServiceRow): Service {
  return {
    id: row.id,
    name: row.name,
    price: priceFromRow(row.base_price_mxn),
    estimatedDays: row.estimated_days,
    isActive: row.is_active,
  }
}

// An in-store price has no base price in the table.
function priceFromRow(basePrice: number | null): ServicePrice {
  return basePrice === null ? { kind: 'inStore' } : { kind: 'base', amountMxn: basePrice }
}

function basePriceOf({ price }: ServiceDetails): number | null {
  return price.kind === 'base' ? price.amountMxn : null
}

function onlyRow(rows: ServiceRow[]): ServiceRow {
  const [row] = rows
  if (row === undefined) throw new Error('The insert returned no row')
  return row
}
