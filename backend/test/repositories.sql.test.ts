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
import { clientAppRepository } from '../src/repositories/client-app.repository.js'
import { clientRepository } from '../src/repositories/client.repository.js'
import { orderRepository } from '../src/repositories/order.repository.js'
import { serviceRepository } from '../src/repositories/service.repository.js'
import type { WeeklySchedule } from '../src/types/agenda.js'
import type { NewOrder } from '../src/types/order.js'
import { nipMatches } from '../src/utils/nip.js'

// Deletion tests that do not involve her auth user.
const KEEP_AUTH_USER = async (): Promise<void> => {}

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

  async function cancunToday(): Promise<string> {
    const { rows } = await pool.query<{ day: string }>("select ((now() at time zone 'America/Cancun')::date)::text as day")
    return rows[0]?.day ?? ''
  }

  // The first Monday at least 8 days ahead: past the seeded appointments and the blocked day.
  async function freeMonday(): Promise<string> {
    const { rows } = await pool.query<{ day: string }>(
      'select (current_date + 8 + (8 - extract(isodow from current_date + 8)::int) % 7)::text as day',
    )
    return rows[0]?.day ?? ''
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

    it('counts her appointments and orders, and answers notFound for a client that does not exist', async () => {
      const clients = clientRepository(pool)

      expect(await clients.history('1')).toEqual({ appointments: 1, orders: 2 })
      expect(await clients.history('4')).toEqual({ appointments: 0, orders: 1 })
      expect(await clients.history('99')).toBe('notFound')
    })
  })

  describe('removing a client', () => {
    const ANA_USER = '00000000-0000-4000-8000-000000000031'

    async function tableCounts() {
      return {
        clients: await countOf('clients'),
        appointments: await countOf('appointments'),
        appointmentServices: await countOf('appointment_services'),
        orders: await countOf('orders'),
        signInAttempts: await countOf('sign_in_attempts'),
      }
    }

    it('deletes her orders, appointments with their services, sign-in attempts and row, and names her auth user', async () => {
      const clients = clientRepository(pool)
      await pool.query("insert into auth.users (id, email) values ($1, '9980000001@clients.calm.app')", [ANA_USER])
      await pool.query('update clients set user_id = $1 where id = 1', [ANA_USER])
      await lockOut('9980000001', '9980000002')
      const rosaBefore = await clients.history('2')

      const deletedUsers: string[] = []
      const removed = await clients.remove('1', async (userId) => {
        deletedUsers.push(userId)
      })

      expect(removed).toEqual({ authUserId: ANA_USER })
      expect(deletedUsers).toEqual([ANA_USER])
      expect(await clients.history('1')).toBe('notFound')
      expect(await tableCounts()).toEqual({
        clients: 5, appointments: 4, appointmentServices: 5, orders: 4, signInAttempts: 1,
      })
      expect(await signInAttemptPhones()).toEqual(['9980000002'])
      expect(await clients.history('2')).toEqual(rosaBefore)
    })

    it('deletes a counter client without a phone and names no auth user', async () => {
      const clients = clientRepository(pool)

      expect(await clients.remove('4', KEEP_AUTH_USER)).toEqual({ authUserId: null })
      expect((await clients.all()).map((client) => client.id)).toEqual(['1', '2', '3', '5', '6'])
      expect(await countOf('orders')).toBe(5)
    })

    it('answers notFound for a client that does not exist and deletes nothing', async () => {
      const before = await tableCounts()

      expect(await clientRepository(pool).remove('99', KEEP_AUTH_USER)).toBe('notFound')
      expect(await tableCounts()).toEqual(before)
    })

    it('deletes nothing when her auth user cannot be deleted', async () => {
      await pool.query("insert into auth.users (id, email) values ($1, '9980000001@clients.calm.app')", [ANA_USER])
      await pool.query('update clients set user_id = $1 where id = 1', [ANA_USER])
      await lockOut('9980000001')
      const before = await tableCounts()

      await expect(
        clientRepository(pool).remove('1', async () => {
          throw new Error('Supabase Auth is down')
        }),
      ).rejects.toThrow('Supabase Auth is down')
      expect(await tableCounts()).toEqual(before)
      expect(await signInAttemptPhones()).toEqual(['9980000001'])
    })

    it('deletes nothing when a statement fails halfway', async () => {
      // Marta's order points to Lucía's appointment, so deleting the appointment breaks the foreign key
      // after Lucía's own orders are already gone inside the transaction.
      await pool.query(
        "insert into orders (client_id, appointment_id, ticket, work, final_price_mxn, delivery_date) values (5, 2, '4300', 'Bastilla', 90, current_date + 4)",
      )
      await pool.query(
        "insert into orders (client_id, ticket, work, final_price_mxn, delivery_date) values (3, '4301', 'Parche', 40, current_date + 4)",
      )
      await lockOut('9980000003')
      const before = await tableCounts()

      await expect(clientRepository(pool).remove('3', KEEP_AUTH_USER))
        .rejects.toMatchObject({ code: '23503', constraint: 'orders_appointment_id_fkey' })
      expect(await tableCounts()).toEqual(before)
      expect(await clientRepository(pool).history('3')).toEqual({ appointments: 1, orders: 1 })
      expect(await signInAttemptPhones()).toEqual(['9980000003'])
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

  describe('client app', () => {
    const ANA = { id: '1', name: 'Ana López', phone: '9980000001' }
    const ANA_USER = '00000000-0000-4000-8000-000000000021'

    async function addAuthUser(id: string, email: string, clientId: number): Promise<void> {
      await pool.query(
        'insert into auth.users (id, email, raw_app_meta_data) values ($1, $2, $3)',
        [id, email, { client_id: clientId }],
      )
    }

    async function statusOfOrder(ticket: string): Promise<string | undefined> {
      const { rows } = await pool.query<{ status: string }>('select status from orders where ticket = $1', [ticket])
      return rows[0]?.status
    }

    it('allows five NIP checks per phone, refuses the sixth, and starts again once cleared', async () => {
      const clientApp = clientAppRepository(pool)
      const claims: boolean[] = []
      for (let attempt = 0; attempt < 6; attempt++) claims.push(await clientApp.claimNipAttempt(ANA.phone))

      expect(claims).toEqual([true, true, true, true, true, false])
      await clientApp.clearSignInAttempts(ANA.phone)
      expect(await signInAttemptPhones()).toEqual([])
      expect(await clientApp.claimNipAttempt(ANA.phone)).toBe(true)
    })

    it('reads the credentials of a phone, with the hash of the seeded test NIP', async () => {
      const clientApp = clientAppRepository(pool)

      const ana = await clientApp.credentialsOf(ANA.phone)

      expect(ana).toMatchObject({ client: ANA, userId: null })
      expect(await nipMatches('1234', ana?.nipHash ?? null)).toBe(true)
      expect(await clientApp.credentialsOf('9980009999')).toBeNull()
    })

    it('links her auth user and then finds her by it', async () => {
      const clientApp = clientAppRepository(pool)
      await addAuthUser(ANA_USER, '9980000001@clients.calm.app', 1)

      expect(await clientApp.signedInClient(ANA_USER)).toBeNull()
      await clientApp.linkAuthUser('1', ANA_USER)
      expect(await clientApp.signedInClient(ANA_USER)).toEqual(ANA)
      expect(await clientApp.signedInClient(ADMIN_ID)).toBeNull()
    })

    it('hands back only her own unlinked auth user', async () => {
      const clientApp = clientAppRepository(pool)
      const email = '9980000001@clients.calm.app'
      await addAuthUser(ANA_USER, email, 1)

      expect(await clientApp.orphanedAuthUserId(email, '1')).toBe(ANA_USER)
      expect(await clientApp.orphanedAuthUserId(email, '2')).toBeNull()
      await clientApp.linkAuthUser('1', ANA_USER)
      expect(await clientApp.orphanedAuthUserId(email, '1')).toBeNull()
    })

    it('lists the active services by id, the urgent charge included', async () => {
      const services = await clientAppRepository(pool).activeServices()

      expect(services.map((service) => service.id)).toEqual(['1', '2', '3', '4', '5', '7'])
      expect(services[0]).toEqual({ id: '1', name: 'Dobladillo de pantalón', category: 'arreglo', basePriceMxn: 80 })
      expect(services.at(-1)).toEqual({ id: '7', name: 'Prenda urgente', category: 'extra', basePriceMxn: 100 })
    })

    it('answers the booking calendar from today on, without saying who booked', async () => {
      const calendar = await clientAppRepository(pool).bookingCalendar()
      const today = await cancunToday()

      expect(calendar.today).toBe(today)
      expect(calendar.now).toMatch(/^\d{2}:\d{2}$/)
      expect(calendar.weekly).toHaveLength(7)
      expect(calendar.weekly).toContainEqual({ weekday: 'monday', opensAt: '09:00', closesAt: '18:00' })
      expect(calendar.weekly).toContainEqual({ weekday: 'sunday', opensAt: null, closesAt: null })
      expect(calendar.blocked).toEqual([await dayFromToday(6)])
      expect(calendar.booked).toContainEqual({ date: await dayFromToday(1), time: '12:00' })
      expect(calendar.booked.every((slot) => slot.date >= today)).toBe(true)
    })

    it('reads her own orders by delivery date and her appointments with their services', async () => {
      const mine = await clientAppRepository(pool).ordersOf('1')

      expect(mine.orders).toEqual([
        { ticket: '6042', work: 'Parche en rodilla', status: 'onTheWay', finalPriceMxn: 40, deliveryDate: await dayFromToday(0) },
        { ticket: '0427', work: 'Dobladillo y cambio de cierre', status: 'inProgress', finalPriceMxn: 200, deliveryDate: await dayFromToday(3) },
      ])
      expect(mine.appointments).toEqual([{
        ticket: '0427', date: await dayFromToday(-2), time: '10:30', preliminaryTotalMxn: 200,
        services: ['Dobladillo de pantalón', 'Cambio de cierre'], hasOrder: true,
      }])
    })

    it('opens a slot only within the hours of an open, unblocked and free day', async () => {
      const clientApp = clientAppRepository(pool)
      const monday = await freeMonday()
      const sunday = (await pool.query<{ day: string }>('select ($1::date + 6)::text as day', [monday])).rows[0]?.day ?? ''

      expect(await clientApp.isSlotOpen(monday, '09:00')).toBe(true)
      expect(await clientApp.isSlotOpen(monday, '17:30')).toBe(true)
      expect(await clientApp.isSlotOpen(monday, '08:30')).toBe(false)
      expect(await clientApp.isSlotOpen(monday, '18:00')).toBe(false)
      expect(await clientApp.isSlotOpen(sunday, '10:00')).toBe(false)
      expect(await clientApp.isSlotOpen(await dayFromToday(1), '12:00')).toBe(false)
      await agendaRepository(pool).blockDay(monday, ADMIN_ID)
      expect(await clientApp.isSlotOpen(monday, '09:00')).toBe(false)
    })

    it('books the appointment and its services together, with a free ticket', async () => {
      const clientApp = clientAppRepository(pool)
      const monday = await freeMonday()

      const booked = await clientApp.book({ clientId: '3', date: monday, time: '10:00', totalMxn: 180, serviceIds: ['1', '7'] })

      expect(booked).toMatchObject({ ticket: expect.stringMatching(/^\d{4}$/) })
      const ticket = typeof booked === 'string' ? '' : booked.ticket
      expect(['0815', '1503', '2210', '0427', '5310', '1290', '6042']).not.toContain(ticket)
      const appointments = await agendaRepository(pool).appointmentsBetween(monday, monday)
      expect(appointments).toEqual([{
        ticket, clientName: 'Lucía Méndez', whatsapp: '9980000003', date: monday, time: '10:00',
        quote: { services: ['Dobladillo de pantalón', 'Prenda urgente'], preliminaryTotalMxn: 180 },
      }])
    })

    it('answers slotTaken for a booked slot and leaves nothing behind', async () => {
      const clientApp = clientAppRepository(pool)
      const tomorrow = await dayFromToday(1)

      expect(await clientApp.book({ clientId: '3', date: tomorrow, time: '12:00', totalMxn: 80, serviceIds: ['1'] })).toBe('slotTaken')
      expect(await countOf('appointments')).toBe(5)
      expect(await countOf('appointment_services')).toBe(7)
    })

    it('rolls the appointment back when a service cannot be linked', async () => {
      const monday = await freeMonday()

      await expect(clientAppRepository(pool).book({ clientId: '3', date: monday, time: '10:00', totalMxn: 80, serviceIds: ['99'] }))
        .rejects.toMatchObject({ code: '23503' })
      expect(await countOf('appointments')).toBe(5)
    })

    it('cancels her appointment more than 24 hours ahead and nothing else', async () => {
      const clientApp = clientAppRepository(pool)
      const today = await cancunToday()
      const later = await dayFromToday(10)
      await pool.query(
        `insert into appointments (client_id, ticket, scheduled_date, scheduled_time, preliminary_total_mxn) values
          (3, '4001', $1, '10:00', 80), (3, '4002', $2, '23:30', 80), (1, '4003', $1, '11:00', 80)`,
        [later, today],
      )
      await pool.query(
        "insert into orders (client_id, appointment_id, ticket, work, final_price_mxn, delivery_date) select 1, id, '4003', 'Parche', 40, $1 from appointments where ticket = '4003'",
        [later],
      )

      expect(await clientApp.cancelAppointment('1', '4001')).toBe(false)
      expect(await clientApp.cancelAppointment('3', '4002')).toBe(false)
      expect(await clientApp.cancelAppointment('1', '4003')).toBe(false)
      expect(await clientApp.cancelAppointment('3', '4001')).toBe(true)
      expect(await clientApp.cancelAppointment('3', '4001')).toBe(false)
      expect(await countOf('appointments')).toBe(7)
    })

    it('marks only her ready order on the way', async () => {
      const clientApp = clientAppRepository(pool)

      expect(await clientApp.markOnMyWay('1', '1290')).toBe(false)
      expect(await clientApp.markOnMyWay('1', '0427')).toBe(false)
      expect(await clientApp.markOnMyWay('2', '1290')).toBe(true)
      expect(await statusOfOrder('1290')).toBe('onTheWay')
      expect(await clientApp.markOnMyWay('2', '1290')).toBe(false)
      expect(await statusOfOrder('0427')).toBe('inProgress')
    })

    it('changes her phone, keeps or replaces her NIP, and refuses a taken phone', async () => {
      const clientApp = clientAppRepository(pool)

      expect(await clientApp.updateProfile('1', { phone: '9980000002', nipHash: null })).toBe('phoneTaken')
      expect(await clientApp.updateProfile('1', { phone: '9980000009', nipHash: null })).toEqual({ ...ANA, phone: '9980000009' })
      expect(await nipMatches('1234', (await clientApp.credentialsOf('9980000009'))?.nipHash ?? null)).toBe(true)
      await clientApp.updateProfile('1', { phone: '9980000009', nipHash: NIP_HASH })
      expect((await clientApp.credentialsOf('9980000009'))?.nipHash).toBe(NIP_HASH)
      expect(await clientApp.credentialsOf(ANA.phone)).toBeNull()
    })
  })

  // What the retired RPCs and Edge Functions guaranteed, now on the backend's SQL
  // (odd/tasks/app-movil-backend.md, L5).
  describe('client app isolation and parity', () => {
    const ANA_PHONE = '9980000001'

    async function statusOfOrder(ticket: string): Promise<string | undefined> {
      const { rows } = await pool.query<{ status: string }>('select status from orders where ticket = $1', [ticket])
      return rows[0]?.status
    }

    async function ticketsOfClient(clientId: string): Promise<string[]> {
      const { rows } = await pool.query<{ ticket: string }>(
        'select ticket from appointments where client_id = $1 order by scheduled_date',
        [clientId],
      )
      return rows.map((row) => row.ticket)
    }

    it('cancels only her appointment when another client has the same ticket', async () => {
      const clientApp = clientAppRepository(pool)
      await pool.query(
        `insert into appointments (client_id, ticket, scheduled_date, scheduled_time, preliminary_total_mxn) values
          (3, '4100', $1, '10:00', 80), (5, '4100', $2, '10:00', 80)`,
        [await dayFromToday(10), await dayFromToday(11)],
      )

      expect(await clientApp.cancelAppointment('3', '4100')).toBe(true)
      expect(await clientApp.cancelAppointment('3', '4100')).toBe(false)
      expect(await ticketsOfClient('3')).toEqual(['0815'])
      expect(await ticketsOfClient('5')).toEqual(['1503', '4100'])
    })

    it('refuses to mark another client\'s ready order on the way and leaves it ready', async () => {
      const clientApp = clientAppRepository(pool)
      await pool.query(
        "insert into orders (client_id, ticket, work, final_price_mxn, delivery_date, status) values (3, '4200', 'Bastilla', 90, $1, 'ready')",
        [await dayFromToday(2)],
      )

      expect(await clientApp.markOnMyWay('2', '4200')).toBe(false)
      expect(await statusOfOrder('4200')).toBe('ready')
      expect(await statusOfOrder('1290')).toBe('ready')
      expect(await clientApp.markOnMyWay('3', '4200')).toBe(true)
      expect(await statusOfOrder('4200')).toBe('onTheWay')
    })

    it('reads only the orders and appointments of the client asking', async () => {
      const clientApp = clientAppRepository(pool)

      const rosa = await clientApp.ordersOf('2')
      const nobody = await clientApp.ordersOf('99')

      expect(rosa.orders.map((order) => order.ticket)).toEqual(['3388', '1290'])
      expect(rosa.appointments.map((appointment) => appointment.ticket)).toEqual(['3388'])
      expect(nobody).toEqual({ orders: [], appointments: [] })
    })

    it('claims five NIP checks with claim_nip_attempt, locks the sixth for 15 minutes, and only that phone', async () => {
      const claims: boolean[] = []
      for (let attempt = 0; attempt < 6; attempt++) {
        const { rows } = await pool.query<{ allowed: boolean }>('select claim_nip_attempt($1) as allowed', [ANA_PHONE])
        claims.push(rows[0]?.allowed ?? true)
      }

      expect(claims).toEqual([true, true, true, true, true, false])
      const { rows: lock } = await pool.query<{ failures: number; minutes: number }>(
        "select failures, extract(epoch from locked_until - now()) / 60 as minutes from sign_in_attempts where phone = $1",
        [ANA_PHONE],
      )
      expect(lock[0]?.failures).toBe(6)
      expect(Number(lock[0]?.minutes)).toBeGreaterThan(14)
      expect(Number(lock[0]?.minutes)).toBeLessThanOrEqual(15)
      expect(await clientAppRepository(pool).claimNipAttempt('9980000002')).toBe(true)
    })

    it('books the appointment with every service, and a second booking of the slot is slotTaken and changes nothing', async () => {
      const clientApp = clientAppRepository(pool)
      const monday = await freeMonday()

      const booked = await clientApp.book({ clientId: '3', date: monday, time: '11:00', totalMxn: 300, serviceIds: ['1', '2', '7'] })

      const ticket = typeof booked === 'string' ? '' : booked.ticket
      const { rows: stored } = await pool.query<{ client_id: string; preliminary_total_mxn: number; service_ids: string[] }>(
        `select a.client_id, a.preliminary_total_mxn,
            array(select service_id::text from appointment_services where appointment_id = a.id order by service_id) as service_ids
          from appointments a where a.ticket = $1 and a.scheduled_date = $2`,
        [ticket, monday],
      )
      expect(stored).toEqual([{ client_id: '3', preliminary_total_mxn: 300, service_ids: ['1', '2', '7'] }])
      expect(await countOf('appointments')).toBe(6)
      expect(await countOf('appointment_services')).toBe(10)

      expect(await clientApp.book({ clientId: '5', date: monday, time: '11:00', totalMxn: 80, serviceIds: ['1'] })).toBe('slotTaken')
      expect(await countOf('appointments')).toBe(6)
      expect(await countOf('appointment_services')).toBe(10)
      expect(await ticketsOfClient('5')).toEqual(['1503'])
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
