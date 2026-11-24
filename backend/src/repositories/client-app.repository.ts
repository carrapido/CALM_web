import { randomInt } from 'node:crypto'
import { DatabaseError, type Pool, type PoolClient } from 'pg'
import type {
  BookingCalendar, CatalogService, ClientAppointment, ClientAppRepository, ClientOrder,
  NewAppointment, ServiceCategory,
} from '../types/client-app.js'
import type { OrderStatus } from '../types/order.js'
import { inTransaction } from '../utils/in-transaction.js'

// node-postgres reads bigint as a string, which is the id type the API uses; dates and times are
// read as text so no timezone shifts them.
type AccountRow = { id: string; name: string; phone: string }

type CredentialsRow = AccountRow & { nip_hash: string | null; user_id: string | null }

type ServiceRow = { id: string; name: string; category: ServiceCategory; base_price_mxn: number | null }

// booking_calendar() answers jsonb, which node-postgres parses.
type CalendarJson = {
  today: string
  now: string
  weekly: { weekday: string; opens_at: string | null; closes_at: string | null }[]
  blocked: string[]
  booked: { date: string; time: string }[]
}

type OrderRow = {
  ticket: string
  work: string
  status: OrderStatus
  final_price_mxn: number
  delivery_date: string
}

type AppointmentRow = {
  ticket: string
  scheduled_date: string
  scheduled_time: string
  preliminary_total_mxn: number
  service_names: string[]
  has_order: boolean
}

const HER_ORDERS = `select ticket, work, status, final_price_mxn, delivery_date::text as delivery_date
  from orders where client_id = $1
  order by delivery_date, id`

const HER_APPOINTMENTS = `select a.ticket, a.scheduled_date::text as scheduled_date,
    to_char(a.scheduled_time, 'HH24:MI') as scheduled_time, a.preliminary_total_mxn,
    array(
      select s.name from appointment_services aps join services s on s.id = aps.service_id
      where aps.appointment_id = a.id order by s.id
    ) as service_names,
    exists (select 1 from orders o where o.appointment_id = a.id) as has_order
  from appointments a where a.client_id = $1
  order by a.scheduled_date, a.scheduled_time`

// The panel's agenda rules: an open weekday from opening up to but not including closing, not a
// blocked day and not booked. to_char's 'FMday' names the weekday as weekly_schedule does.
const SLOT_IS_OPEN = `select exists (
      select 1 from weekly_schedule w
      where w.weekday = to_char($1::date, 'FMday') and $2::time >= w.opens_at and $2::time < w.closes_at
    )
    and not exists (select 1 from blocked_dates where blocked_date = $1::date)
    and not exists (select 1 from appointments where scheduled_date = $1::date and scheduled_time = $2::time)
    as is_open`

// The tickets in use: open orders and appointments still to come, on Cancún's calendar.
const TAKEN_TICKETS = `select ticket from orders where status not in ('delivered', 'cancelled')
  union
  select ticket from appointments where scheduled_date >= (now() at time zone 'America/Cancun')::date`

const INSERT_APPOINTMENT = `insert into appointments (client_id, ticket, scheduled_date, scheduled_time, preliminary_total_mxn)
  values ($1, $2, $3, $4, $5)
  returning id`

const INSERT_APPOINTMENT_SERVICES = `insert into appointment_services (appointment_id, service_id)
  select $1, unnest($2::bigint[])`

// Deleted, as the panel cancels, so the slot is free again; its services go with it.
const CANCEL_HER_APPOINTMENT = `delete from appointments a
  where a.ticket = $1 and a.client_id = $2
    and not exists (select 1 from orders o where o.appointment_id = a.id)
    and (a.scheduled_date + a.scheduled_time) - (now() at time zone 'America/Cancun') > interval '24 hours'`

const MARK_HER_ORDER_ON_THE_WAY = `update orders set status = 'onTheWay'
  where ticket = $1 and client_id = $2 and status = 'ready'`

const UPDATE_PROFILE = `update clients set phone = $2, nip_hash = coalesce($3, nip_hash)
  where id = $1
  returning id, name, phone`

const UNIQUE_VIOLATION = '23505'
const TICKET_COUNT = 10_000
const TICKET_DRAWS = 100

export function clientAppRepository(pool: Pool): ClientAppRepository {
  return {
    async signedInClient(userId) {
      const { rows } = await pool.query<AccountRow>('select id, name, phone from clients where user_id = $1', [userId])
      return rows[0] ?? null
    },

    async credentialsOf(phone) {
      const { rows } = await pool.query<CredentialsRow>(
        'select id, name, phone, nip_hash, user_id from clients where phone = $1',
        [phone],
      )
      const [row] = rows
      if (row === undefined) return null
      return { client: { id: row.id, name: row.name, phone: row.phone }, nipHash: row.nip_hash, userId: row.user_id }
    },

    // One atomic statement in the database, so a burst of concurrent checks cannot slip past the count.
    async claimNipAttempt(phone) {
      const { rows } = await pool.query<{ allowed: boolean }>('select claim_nip_attempt($1) as allowed', [phone])
      return rows[0]?.allowed === true
    },

    async clearSignInAttempts(phone) {
      await pool.query('delete from sign_in_attempts where phone = $1', [phone])
    },

    async orphanedAuthUserId(email, clientId) {
      const { rows } = await pool.query<{ user_id: string | null }>(
        'select orphaned_auth_user_id($1, $2) as user_id',
        [email, clientId],
      )
      return rows[0]?.user_id ?? null
    },

    async linkAuthUser(clientId, userId) {
      await pool.query('update clients set user_id = $2 where id = $1', [clientId, userId])
    },

    async activeServices() {
      const { rows } = await pool.query<ServiceRow>(
        'select id, name, category, base_price_mxn from services where is_active order by id',
      )
      return rows.map(catalogServiceFrom)
    },

    async bookingCalendar() {
      const { rows } = await pool.query<{ calendar: CalendarJson }>('select booking_calendar() as calendar')
      const [row] = rows
      if (row === undefined) throw new Error('booking_calendar() returned no row')
      return bookingCalendarFrom(row.calendar)
    },

    async ordersOf(clientId) {
      const [orders, appointments] = await Promise.all([
        pool.query<OrderRow>(HER_ORDERS, [clientId]),
        pool.query<AppointmentRow>(HER_APPOINTMENTS, [clientId]),
      ])
      return { orders: orders.rows.map(clientOrderFrom), appointments: appointments.rows.map(clientAppointmentFrom) }
    },

    async isSlotOpen(date, time) {
      const { rows } = await pool.query<{ is_open: boolean }>(SLOT_IS_OPEN, [date, time])
      return rows[0]?.is_open === true
    },

    // One appointment per slot: a slot someone took after the check breaks the unique key.
    async book(appointment) {
      try {
        return await inTransaction(pool, (db) => insertAppointment(db, appointment))
      } catch (error) {
        if (isUniqueViolation(error, 'appointments_scheduled_date_scheduled_time_key')) return 'slotTaken'
        throw error
      }
    },

    async cancelAppointment(clientId, ticket) {
      const { rowCount } = await pool.query(CANCEL_HER_APPOINTMENT, [ticket, clientId])
      return rowCount !== null && rowCount > 0
    },

    async markOnMyWay(clientId, ticket) {
      const { rowCount } = await pool.query(MARK_HER_ORDER_ON_THE_WAY, [ticket, clientId])
      return rowCount !== null && rowCount > 0
    },

    async updateProfile(clientId, { phone, nipHash }) {
      try {
        const { rows } = await pool.query<AccountRow>(UPDATE_PROFILE, [clientId, phone, nipHash])
        return onlyRow(rows)
      } catch (error) {
        if (isUniqueViolation(error, 'clients_phone_key')) return 'phoneTaken'
        throw error
      }
    },
  }
}

async function insertAppointment(db: PoolClient, appointment: NewAppointment): Promise<{ ticket: string }> {
  const { rows: taken } = await db.query<{ ticket: string }>(TAKEN_TICKETS)
  const ticket = freeTicketOutside(new Set(taken.map((row) => row.ticket)))
  const { rows } = await db.query<{ id: string }>(INSERT_APPOINTMENT, [
    appointment.clientId, ticket, appointment.date, appointment.time, appointment.totalMxn,
  ])
  await db.query(INSERT_APPOINTMENT_SERVICES, [onlyRow(rows).id, appointment.serviceIds])
  return { ticket }
}

// 4 random digits that no ticket in use has.
function freeTicketOutside(taken: Set<string>): string {
  for (let draw = 0; draw < TICKET_DRAWS; draw++) {
    const ticket = String(randomInt(TICKET_COUNT)).padStart(4, '0')
    if (!taken.has(ticket)) return ticket
  }
  throw new Error('No free ticket left')
}

function isUniqueViolation(error: unknown, constraint: string): boolean {
  return error instanceof DatabaseError && error.code === UNIQUE_VIOLATION && error.constraint === constraint
}

function catalogServiceFrom(row: ServiceRow): CatalogService {
  return { id: row.id, name: row.name, category: row.category, basePriceMxn: row.base_price_mxn }
}

function bookingCalendarFrom(calendar: CalendarJson): BookingCalendar {
  return {
    today: calendar.today,
    now: calendar.now,
    weekly: calendar.weekly.map((day) => ({ weekday: day.weekday, opensAt: day.opens_at, closesAt: day.closes_at })),
    blocked: calendar.blocked,
    booked: calendar.booked,
  }
}

function clientOrderFrom(row: OrderRow): ClientOrder {
  return {
    ticket: row.ticket,
    work: row.work,
    status: row.status,
    finalPriceMxn: row.final_price_mxn,
    deliveryDate: row.delivery_date,
  }
}

function clientAppointmentFrom(row: AppointmentRow): ClientAppointment {
  return {
    ticket: row.ticket,
    date: row.scheduled_date,
    time: row.scheduled_time,
    preliminaryTotalMxn: row.preliminary_total_mxn,
    services: row.service_names,
    hasOrder: row.has_order,
  }
}

function onlyRow<Row>(rows: Row[]): Row {
  const [row] = rows
  if (row === undefined) throw new Error('The statement returned no row')
  return row
}
