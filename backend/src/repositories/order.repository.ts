import { DatabaseError, type Pool, type PoolClient } from 'pg'
import {
  isOrderStatus, type AddRefusal, type NewOrder, type Order, type OrderRepository, type OrderStatus,
} from '../types/order.js'

// One order with its client and, when it came from one, its appointment. Dates and times
// are read as text, because node-postgres turns a `date` into a JavaScript Date.
type OrderRow = {
  ticket: string
  work: string
  final_price_mxn: number
  delivery_date: string
  status: string
  client_name: string
  client_phone: string | null
  appointment_date: string | null
  appointment_time: string | null
}

type Owner = { clientId: string; appointmentId: string | null }

// `o` is the orders table or a CTE with its rows.
const ORDER_COLUMNS = `select o.ticket, o.work, o.final_price_mxn, o.delivery_date::text as delivery_date,
    o.status, c.name as client_name, c.phone as client_phone,
    a.scheduled_date::text as appointment_date, to_char(a.scheduled_time, 'HH24:MI') as appointment_time`
const CLIENT_AND_APPOINTMENT = `join clients c on c.id = o.client_id
  left join appointments a on a.id = o.appointment_id`

// Every value goes in as a $n parameter; only the fixed fragments above are part of the text.
// safe-anything:ignore
const SELECT_ORDERS = `${ORDER_COLUMNS} from orders o ${CLIENT_AND_APPOINTMENT} order by o.delivery_date`

// safe-anything:ignore
const INSERT_ORDER = `with inserted as (
    insert into orders (ticket, client_id, appointment_id, work, final_price_mxn, delivery_date, status)
    values ($1, $2, $3, $4, $5, $6, $7)
    returning *
  )
  ${ORDER_COLUMNS} from inserted o ${CLIENT_AND_APPOINTMENT}`

// A ticket belongs to one active order at a time (index orders_active_ticket_key).
// safe-anything:ignore
const UPDATE_ACTIVE_ORDER = `with updated as (
    update orders set work = $1, final_price_mxn = $2, delivery_date = $3, status = $4
    where ticket = $5 and status not in ('delivered', 'cancelled')
    returning *
  )
  ${ORDER_COLUMNS} from updated o ${CLIENT_AND_APPOINTMENT}`

const UNIQUE_VIOLATION = '23505'
const REFUSAL_BY_UNIQUE_KEY: Record<string, AddRefusal> = {
  orders_active_ticket_key: 'ticketTaken',
  orders_appointment_id_key: 'appointmentHasOrder',
}

export function orderRepository(pool: Pool): OrderRepository {
  return {
    async all() {
      const { rows } = await pool.query<OrderRow>(SELECT_ORDERS)
      return rows.map(orderFromRow)
    },

    // The client and the order go in together: a refused order leaves no new client behind.
    async add(order) {
      try {
        return await inTransaction(pool, (db) => addOrder(db, order))
      } catch (error) {
        const refusal = refusalOf(error)
        if (refusal === undefined) throw error
        return refusal
      }
    },

    async updateActive(ticket, changes) {
      const { rows } = await pool.query<OrderRow>(
        UPDATE_ACTIVE_ORDER,
        [changes.work, changes.finalPriceMxn, changes.deliveryDate, changes.status, ticket],
      )
      return rows[0] === undefined ? null : orderFromRow(rows[0])
    },
  }
}

async function inTransaction<T>(pool: Pool, work: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await pool.connect()
  try {
    await db.query('begin')
    const result = await work(db)
    await db.query('commit')
    return result
  } catch (error) {
    await db.query('rollback')
    throw error
  } finally {
    db.release()
  }
}

async function addOrder(db: PoolClient, order: NewOrder): Promise<Order | AddRefusal> {
  const owner = await ownerOf(db, order)
  if (owner === null) return 'appointmentNotFound'
  const { rows } = await db.query<OrderRow>(INSERT_ORDER, [
    order.ticket, owner.clientId, owner.appointmentId,
    order.work, order.finalPriceMxn, order.deliveryDate, order.status,
  ])
  return orderFromRow(onlyRow(rows))
}

// An order from an appointment belongs to its client; null when no appointment is in that slot.
async function ownerOf(db: PoolClient, order: NewOrder): Promise<Owner | null> {
  if (order.appointment === undefined) {
    return { clientId: await walkInClientIdOf(db, order.clientName, order.whatsapp), appointmentId: null }
  }
  const { rows } = await db.query<{ id: string; client_id: string }>(
    'select id, client_id from appointments where scheduled_date = $1 and scheduled_time = $2',
    [order.appointment.date, order.appointment.time],
  )
  const [appointment] = rows
  return appointment === undefined ? null : { clientId: appointment.client_id, appointmentId: appointment.id }
}

// The phone is unique in `clients`, so a walk-in client with a known number is the client
// already stored under it.
async function walkInClientIdOf(db: PoolClient, name: string, phone: string | undefined): Promise<string> {
  if (phone !== undefined) {
    const { rows } = await db.query<{ id: string }>('select id from clients where phone = $1', [phone])
    if (rows[0] !== undefined) return rows[0].id
  }
  const { rows } = await db.query<{ id: string }>(
    'insert into clients (name, phone) values ($1, $2) returning id',
    [name, phone ?? null],
  )
  return onlyRow(rows).id
}

function refusalOf(error: unknown): AddRefusal | undefined {
  if (!(error instanceof DatabaseError) || error.code !== UNIQUE_VIOLATION) return undefined
  return REFUSAL_BY_UNIQUE_KEY[error.constraint ?? '']
}

function orderFromRow(row: OrderRow): Order {
  return {
    ticket: row.ticket,
    clientName: row.client_name,
    whatsapp: row.client_phone ?? undefined,
    work: row.work,
    finalPriceMxn: row.final_price_mxn,
    deliveryDate: row.delivery_date,
    status: statusFrom(row.status),
    appointment:
      row.appointment_date !== null && row.appointment_time !== null
        ? { date: row.appointment_date, time: row.appointment_time }
        : undefined,
  }
}

function statusFrom(value: string): OrderStatus {
  if (!isOrderStatus(value)) throw new Error(`Unknown order status: ${value}`)
  return value
}

function onlyRow<Row>(rows: Row[]): Row {
  const [row] = rows
  if (row === undefined) throw new Error('The insert returned no row')
  return row
}
