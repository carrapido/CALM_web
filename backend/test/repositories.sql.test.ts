// @vitest-environment node
// The SQL repositories against a real Postgres. Every test starts from a database wiped and
// loaded again with database/schema.sql and database/seed.sql, so it runs only against a
// throwaway database named by TEST_DATABASE_URL (README, "Pruebas contra una base de datos
// desechable"). It never reads DATABASE_URL: the database the API uses is never wiped.
import { readFileSync } from 'node:fs'
import { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { adminRepository } from '../src/repositories/admin.repository.js'
import { agendaRepository } from '../src/repositories/agenda.repository.js'
import { clientRepository } from '../src/repositories/client.repository.js'
import { orderRepository } from '../src/repositories/order.repository.js'
import { serviceRepository } from '../src/repositories/service.repository.js'
import type { WeeklySchedule } from '../src/types/agenda.js'
import type { NewOrder } from '../src/types/order.js'

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL
const ADMIN_ID = '00000000-0000-4000-8000-000000000001'
const NIP_HASH = 'hash-de-prueba'

const SEED_SCHEDULE: WeeklySchedule = {
  monday: { isOpen: true, opensAt: '09:00', closesAt: '18:00' },
  tuesday: { isOpen: true, opensAt: '09:00', closesAt: '18:00' },
  wednesday: { isOpen: true, opensAt: '09:00', closesAt: '18:00' },
  thursday: { isOpen: true, opensAt: '09:00', closesAt: '18:00' },
  friday: { isOpen: true, opensAt: '09:00', closesAt: '18:00' },
  saturday: { isOpen: true, opensAt: '10:00', closesAt: '14:00' },
  sunday: { isOpen: false },
}

describe.skipIf(TEST_DATABASE_URL === undefined)('The SQL repositories on a throwaway database', () => {
  let pool: Pool

  beforeAll(() => {
    // Every test wipes the database, so only a database on this machine is accepted.
    const host = new URL(TEST_DATABASE_URL ?? '').hostname
    if (!['localhost', '127.0.0.1', '::1', '[::1]'].includes(host)) {
      throw new Error(`TEST_DATABASE_URL must point to a local throwaway database, not ${host}`)
    }
    pool = new Pool({ connectionString: TEST_DATABASE_URL })
  })

  afterAll(async () => {
    await pool.end()
  })

  beforeEach(async () => {
    await loadFreshDatabase(pool)
  })

  // The seed dates its appointments from current_date, so the tests ask the database for them.
  async function dayFromToday(days: number): Promise<string> {
    const { rows } = await pool.query<{ day: string }>('select (current_date + $1::int)::text as day', [days])
    return rows[0]?.day ?? ''
  }

  async function countOf(table: string): Promise<number> {
    // safe-anything:ignore (the table name comes from this file, never from input)
    const { rows } = await pool.query<{ count: string }>(`select count(*) from ${table}`)
    return Number(rows[0]?.count)
  }

  async function signInAttemptPhones(): Promise<string[]> {
    const { rows } = await pool.query<{ phone: string }>('select phone from sign_in_attempts order by phone')
    return rows.map((row) => row.phone)
  }

  async function lockOut(...phones: string[]): Promise<void> {
    await pool.query(
      "insert into sign_in_attempts (phone, failures, locked_until) select unnest($1::text[]), 5, now() + interval '1 hour'",
      [phones],
    )
  }

  describe('admins', () => {
    it('knows the test admin and nobody else', async () => {
      const admins = adminRepository(pool)

      expect(await admins.isAdmin(ADMIN_ID)).toBe(true)
      expect(await admins.isAdmin('00000000-0000-4000-8000-000000000002')).toBe(false)
    })
  })

  describe('services', () => {
    const NEW_SERVICE = { name: 'Bordado', price: { kind: 'inStore' as const }, estimatedDays: 7 }

    it('adds a service, active and with the next id', async () => {
      const services = serviceRepository(pool)

      const added = await services.add(NEW_SERVICE)

      expect(added).toEqual({ ...NEW_SERVICE, id: '8', isActive: true })
      expect(await services.all()).toContainEqual(added)
    })

    it('updates a service and answers null for one that does not exist', async () => {
      const services = serviceRepository(pool)
      const patch = { id: '3', name: 'Parche grande', price: { kind: 'base' as const, amountMxn: 60 }, estimatedDays: 1, isActive: false }

      expect(await services.update(patch)).toEqual(patch)
      expect(await services.update({ ...patch, id: '99' })).toBeNull()
      expect((await services.all()).find((service) => service.id === '3')).toEqual(patch)
    })

    it('keeps a service an appointment uses and deletes one nobody uses', async () => {
      const services = serviceRepository(pool)

      expect(await services.remove('5')).toBe('inUse')
      expect(await services.remove('6')).toBe('deleted')
      expect(await services.remove('99')).toBe('notFound')
      expect((await services.all()).map((service) => service.id)).toEqual(['1', '2', '3', '4', '5', '7'])
    })

    it('refuses a repeated name with services_name_key and adds nothing', async () => {
      const services = serviceRepository(pool)

      await expect(services.add({ ...NEW_SERVICE, name: 'Parche' }))
        .rejects.toMatchObject({ code: '23505', constraint: 'services_name_key' })
      expect(await countOf('services')).toBe(7)
    })
  })

  describe('clients', () => {
    it('adds a client with app access and lifts the lockout on her phone', async () => {
      const clients = clientRepository(pool)
      await lockOut('9980000007', '9980000008')

      const added = await clients.add({ name: 'Paola Ríos', phone: '9980000007', nipHash: NIP_HASH })

      expect(added).toEqual({ id: '7', name: 'Paola Ríos', phone: '9980000007', hasAppAccess: true })
      expect(await signInAttemptPhones()).toEqual(['9980000008'])
    })

    it('refuses a phone that is taken and adds nothing', async () => {
      const clients = clientRepository(pool)

      expect(await clients.add({ name: 'Otra', phone: '9980000001', nipHash: NIP_HASH })).toBe('phoneTaken')
      expect(await countOf('clients')).toBe(6)
    })

    it('grants access with a new phone and lifts the lockout on both phones', async () => {
      const clients = clientRepository(pool)
      await lockOut('9980000002', '9980000009', '9980000008')

      const granted = await clients.grantAccess({ clientId: '2', phone: '9980000009', nipHash: NIP_HASH })

      expect(granted).toEqual({
        client: { id: '2', name: 'Rosa Pérez', phone: '9980000009', hasAppAccess: true },
        authUserToRename: null,
      })
      expect(await signInAttemptPhones()).toEqual(['9980000008'])
    })

    it('names the auth user to rename when an app user changes her phone', async () => {
      const userId = '00000000-0000-4000-8000-000000000011'
      await pool.query("insert into auth.users (id, email) values ($1, '9980000001@clients.calm.app')", [userId])
      await pool.query('update clients set user_id = $1 where id = 1', [userId])

      const granted = await clientRepository(pool).grantAccess({ clientId: '1', phone: '9980000009', nipHash: NIP_HASH })

      expect(granted).toMatchObject({ authUserToRename: userId })
    })

    it('refuses a phone that is taken and changes nothing', async () => {
      const clients = clientRepository(pool)
      await lockOut('9980000002')
      const before = await clients.all()

      const granted = await clients.grantAccess({ clientId: '2', phone: '9980000001', nipHash: NIP_HASH })

      expect(granted).toBe('phoneTaken')
      expect(await clients.all()).toEqual(before)
      expect(await signInAttemptPhones()).toEqual(['9980000002'])
    })

    it('answers notFound for a client that does not exist', async () => {
      const granted = await clientRepository(pool).grantAccess({ clientId: '99', phone: '9980000009', nipHash: NIP_HASH })

      expect(granted).toBe('notFound')
    })
  })

  describe('agenda', () => {
    it('reads the seeded week and saves a new one', async () => {
      const agenda = agendaRepository(pool)
      const week: WeeklySchedule = { ...SEED_SCHEDULE, sunday: { isOpen: true, opensAt: '10:00', closesAt: '13:30' } }

      expect(await agenda.weeklySchedule()).toEqual(SEED_SCHEDULE)
      await agenda.saveWeeklySchedule(week, ADMIN_ID)
      expect(await agenda.weeklySchedule()).toEqual(week)
    })

    it('saves the seven days together or none of them', async () => {
      const agenda = agendaRepository(pool)
      const week: WeeklySchedule = {
        ...SEED_SCHEDULE,
        monday: { isOpen: false },
        sunday: { isOpen: true, opensAt: '12:00', closesAt: '10:00' },
      }

      await expect(agenda.saveWeeklySchedule(week, ADMIN_ID)).rejects.toMatchObject({ code: '23514' })
      expect(await agenda.weeklySchedule()).toEqual(SEED_SCHEDULE)
    })

    it('blocks a day once even when asked twice, and unblocks it', async () => {
      const agenda = agendaRepository(pool)
      const seeded = await dayFromToday(6)
      const day = await dayFromToday(20)

      await agenda.blockDay(day, ADMIN_ID)
      await agenda.blockDay(day, ADMIN_ID)
      expect(await agenda.blockedDates()).toEqual([seeded, day])

      await agenda.unblockDay(day)
      expect(await agenda.blockedDates()).toEqual([seeded])
    })

    it('lists the appointments between two days by date and time, with their services', async () => {
      const agenda = agendaRepository(pool)
      const twoDaysAgo = await dayFromToday(-2)

      const appointments = await agenda.appointmentsBetween(twoDaysAgo, await dayFromToday(2))

      expect(appointments.map((appointment) => appointment.ticket)).toEqual(['0427', '0815', '1503'])
      expect(appointments[0]).toEqual({
        ticket: '0427',
        clientName: 'Ana López',
        whatsapp: '9980000001',
        date: twoDaysAgo,
        time: '10:30',
        quote: { services: ['Dobladillo de pantalón', 'Cambio de cierre'], preliminaryTotalMxn: 200 },
      })
    })

    it('cancels only the appointment with that ticket on that date', async () => {
      const agenda = agendaRepository(pool)
      const tomorrow = await dayFromToday(1)
      const later = await dayFromToday(4)
      await pool.query(
        "insert into appointments (client_id, ticket, scheduled_date, scheduled_time, preliminary_total_mxn) values (3, '0815', $1, '10:00', 80)",
        [later],
      )

      expect(await agenda.cancelAppointment('0815', tomorrow)).toBe(true)
      expect(await agenda.cancelAppointment('0815', tomorrow)).toBe(false)
      const left = await agenda.appointmentsBetween(tomorrow, later)
      expect(left.filter((appointment) => appointment.ticket === '0815').map((appointment) => appointment.date)).toEqual([later])
    })

    it('refuses to cancel an appointment with an order, with orders_appointment_id_fkey', async () => {
      const agenda = agendaRepository(pool)
      const twoDaysAgo = await dayFromToday(-2)

      await expect(agenda.cancelAppointment('0427', twoDaysAgo))
        .rejects.toMatchObject({ code: '23503', constraint: 'orders_appointment_id_fkey' })
      expect((await agenda.appointmentsBetween(twoDaysAgo, twoDaysAgo)).map((appointment) => appointment.ticket)).toEqual(['0427'])
    })
  })

  describe('orders', () => {
    async function walkInOrder(ticket: string, clientName: string, whatsapp?: string): Promise<NewOrder> {
      return { ticket, clientName, whatsapp, work: 'Bastilla', finalPriceMxn: 90, deliveryDate: await dayFromToday(5), status: 'received' }
    }

    it('stores an order from an appointment for its client', async () => {
      const orders = orderRepository(pool)
      const tomorrow = await dayFromToday(1)
      const deliveryDate = await dayFromToday(4)
      const order: NewOrder = {
        ticket: '0815', appointment: { date: tomorrow, time: '12:00' }, work: 'Dobladillo', finalPriceMxn: 80, deliveryDate, status: 'received',
      }

      const added = await orders.add(order)

      expect(added).toEqual({
        ticket: '0815', clientName: 'Lucía Méndez', whatsapp: '9980000003', work: 'Dobladillo',
        finalPriceMxn: 80, deliveryDate, status: 'received', appointment: { date: tomorrow, time: '12:00' },
      })
      expect(await orders.all()).toContainEqual(added)
    })

    it('refuses an empty slot and an appointment that already has an order', async () => {
      const orders = orderRepository(pool)
      const order = {
        work: 'Dobladillo', finalPriceMxn: 80, deliveryDate: await dayFromToday(4), status: 'received' as const,
      }

      expect(await orders.add({ ...order, ticket: '9001', appointment: { date: await dayFromToday(1), time: '13:00' } }))
        .toBe('appointmentNotFound')
      expect(await orders.add({ ...order, ticket: '9002', appointment: { date: await dayFromToday(-2), time: '10:30' } }))
        .toBe('appointmentHasOrder')
      expect(await countOf('orders')).toBe(6)
    })

    it('creates the client of a walk-in order with a new phone', async () => {
      const added = await orderRepository(pool).add(await walkInOrder('9003', 'Paola Ríos', '9980000099'))

      expect(added).toMatchObject({ ticket: '9003', clientName: 'Paola Ríos', whatsapp: '9980000099' })
      expect(await countOf('clients')).toBe(7)
    })

    it('gives a walk-in order with a known phone to the client already stored under it', async () => {
      const added = await orderRepository(pool).add(await walkInOrder('9004', 'Otro nombre', '9980000002'))

      expect(added).toMatchObject({ ticket: '9004', clientName: 'Rosa Pérez', whatsapp: '9980000002' })
      expect(await countOf('clients')).toBe(6)
    })

    it('refuses a ticket an active order holds and leaves no new client behind', async () => {
      const outcome = await orderRepository(pool).add(await walkInOrder('5310', 'Paola Ríos', '9980000099'))

      expect(outcome).toBe('ticketTaken')
      expect(await countOf('clients')).toBe(6)
      expect(await countOf('orders')).toBe(6)
    })

    it('rolls the new client back when the order insert fails', async () => {
      const order = { ...(await walkInOrder('9005', 'Paola Ríos', '9980000099')), finalPriceMxn: -1 }

      await expect(orderRepository(pool).add(order)).rejects.toMatchObject({ code: '23514' })
      expect(await countOf('clients')).toBe(6)
      expect(await countOf('orders')).toBe(6)
    })

    it('updates an active order and leaves a delivered one as it was', async () => {
      const orders = orderRepository(pool)
      const deliveryDate = await dayFromToday(9)
      const changes = { work: 'Cierre nuevo', finalPriceMxn: 130, deliveryDate, status: 'inProgress' as const }
      const before = await orders.all()

      expect(await orders.updateActive('1290', changes)).toMatchObject({ ticket: '1290', ...changes })
      expect(await orders.updateActive('3388', changes)).toBeNull()
      const delivered = (await orders.all()).find((order) => order.ticket === '3388')
      expect(delivered).toEqual(before.find((order) => order.ticket === '3388'))
    })
  })
})

// Wipes the throwaway database and loads it as the README tells: schema, an admin, seed.
async function loadFreshDatabase(pool: Pool): Promise<void> {
  await pool.query('drop schema if exists public, private, auth cascade; create schema public')
  await pool.query(sqlFile('schema.sql'))
  await pool.query("insert into auth.users (id, email) values ($1, '9980000000@panel.calm.invalid')", [ADMIN_ID])
  await pool.query('insert into admins (id) values ($1)', [ADMIN_ID])
  await pool.query(sqlFile('seed.sql'))
}

function sqlFile(name: string): string {
  return readFileSync(new URL(`../../database/${name}`, import.meta.url), 'utf8')
}
