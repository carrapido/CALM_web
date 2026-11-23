// Books an appointment from the client app, creating her account when the phone is new.
//
// Everything is decided here, never by the app: the services must be active, the slot free under
// the panel's agenda rules, the total is computed from the catalog, and the ticket follows the
// panel's rule. A phone that already has an account needs its NIP, checked under the same
// per-phone throttle as sign-in; a phone with no NIP is refused, because knowing a phone alone
// never grants access to an account.
//
// Spec: CALM_mobile odd/tasks/acciones-cliente.md (S2-S5).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  adminClient,
  answer,
  authUserIdOf,
  claimNipAttempt,
  clearFailures,
  type ClientRow,
  clientSummary,
  clientWithPhone,
  digitsOf,
  hashNip,
  NIP_PATTERN,
  nipMatches,
  PHONE_PATTERN,
  problem,
  refreshTokenFor,
  REJECTED,
  serveClientFunction,
  THROTTLED,
  UNAVAILABLE,
} from '../_shared/client-auth.ts'

const SLOT_TAKEN = 'Ese horario se acaba de ocupar. Elige otro.'
const PHONE_WITHOUT_NIP =
  'Ese celular ya está registrado en el taller. Escríbele para que te dé tu NIP.'
const SERVICE_UNAVAILABLE = 'Uno de tus arreglos ya no está disponible. Vuelve a elegirlos.'

// getUTCDay order, Sunday first, as weekly_schedule names the days.
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const BOOKING_HORIZON_DAYS = 62
const TICKET_COUNT = 10_000

type Booking = {
  name: string
  phone: string
  nip: string
  serviceIds: number[]
  isUrgent: boolean
  date: string
  time: string
}

serveClientFunction('client-book', async (request) => {
  const booking = readBooking(await request.json().catch(() => null))
  if (booking === null) return problem(400, 'Revisa los datos de tu cita.')

  const admin = adminClient()

  const quote = await quoteOf(admin, booking)
  if (quote === null) return problem(409, SERVICE_UNAVAILABLE, 'service_unavailable')
  if (!(await isBookable(admin, booking))) return problem(409, SLOT_TAKEN, 'slot_taken')

  const client = await clientFor(admin, booking)
  if (client === 'throttled') return problem(429, THROTTLED)
  if (client === 'rejected') return problem(401, REJECTED)
  if (client === 'without_nip') return problem(409, PHONE_WITHOUT_NIP, 'phone_without_nip')

  const ticket = await freeTicket(admin)
  const appointment = await admin
    .from('appointments')
    .insert({
      client_id: client.id,
      ticket,
      scheduled_date: booking.date,
      scheduled_time: booking.time,
      preliminary_total_mxn: quote.totalMxn,
    })
    .select('id')
    .single()
  // One appointment per slot: someone took it between the check and the insert.
  if (appointment.error?.code === '23505') return problem(409, SLOT_TAKEN, 'slot_taken')
  if (appointment.error !== null) throw appointment.error

  const links = await admin
    .from('appointment_services')
    .insert(quote.serviceIds.map((serviceId) => ({ appointment_id: appointment.data.id, service_id: serviceId })))
  if (links.error !== null) {
    await admin.from('appointments').delete().eq('id', appointment.data.id)
    throw links.error
  }

  await clearFailures(admin, booking.phone)
  const refreshToken = await refreshTokenFor(admin, await authUserIdOf(admin, client))
  if (refreshToken === null) return problem(500, UNAVAILABLE)
  return answer(200, {
    ticket,
    refresh_token: refreshToken,
    client: clientSummary(client),
    appointment: { date: booking.date, time: booking.time, total_mxn: quote.totalMxn },
  })
})

function readBooking(body: unknown): Booking | null {
  if (typeof body !== 'object' || body === null) return null
  const fields = body as Record<string, unknown>
  const name = typeof fields.name === 'string' ? fields.name.trim() : ''
  const phone = digitsOf(fields.phone)
  const nip = digitsOf(fields.nip)
  const ids = Array.isArray(fields.service_ids) ? fields.service_ids : []
  const date = typeof fields.date === 'string' ? fields.date : ''
  const time = typeof fields.time === 'string' ? fields.time : ''
  const isValid = name.length > 0 && name.length <= 80 &&
    PHONE_PATTERN.test(phone) && NIP_PATTERN.test(nip) &&
    ids.length > 0 && ids.length <= 20 && ids.every((id) => Number.isInteger(id) && id > 0) &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) && /^([01]\d|2[0-3]):(00|30)$/.test(time)
  if (!isValid) return null
  return {
    name,
    phone,
    nip,
    serviceIds: [...new Set(ids as number[])],
    isUrgent: fields.urgent === true,
    date,
    time,
  }
}

type Quote = { serviceIds: number[]; totalMxn: number }

/// The marked repairs, all of them active, plus the urgency charge when the garment is urgent and
/// the workshop defined one. Null when a repair is no longer offered.
async function quoteOf(admin: SupabaseClient, booking: Booking): Promise<Quote | null> {
  const { data, error } = await admin
    .from('services')
    .select('id, category, base_price_mxn')
    .eq('is_active', true)
  if (error !== null) throw error
  const services = data as { id: number; category: string; base_price_mxn: number | null }[]

  const repairs = booking.serviceIds.map((id) => services.find((s) => s.id === id && s.category === 'arreglo'))
  if (repairs.some((repair) => repair === undefined)) return null
  const urgentCharge = booking.isUrgent ? services.find((s) => s.category === 'extra') : undefined

  const charged = [...repairs, ...(urgentCharge === undefined ? [] : [urgentCharge])]
  return {
    serviceIds: charged.map((service) => service!.id),
    totalMxn: charged.reduce((sum, service) => sum + (service!.base_price_mxn ?? 0), 0),
  }
}

/// The panel's agenda rules: an open weekday, from opening up to but not including closing, not a
/// blocked day, not booked, not started yet on Cancún's wall clock, and not too far ahead.
async function isBookable(admin: SupabaseClient, booking: Booking): Promise<boolean> {
  const { today, nowTime } = cancunClock()
  const lastDay = addDays(today, BOOKING_HORIZON_DAYS)
  if (booking.date < today || booking.date > lastDay) return false
  if (booking.date === today && booking.time <= nowTime) return false

  const weekday = WEEKDAYS[new Date(`${booking.date}T00:00:00Z`).getUTCDay()]
  const [hours, blocked, booked] = await Promise.all([
    admin.from('weekly_schedule').select('opens_at, closes_at').eq('weekday', weekday).maybeSingle(),
    admin.from('blocked_dates').select('blocked_date').eq('blocked_date', booking.date).maybeSingle(),
    admin.from('appointments').select('id').eq('scheduled_date', booking.date)
      .eq('scheduled_time', booking.time).maybeSingle(),
  ])
  for (const result of [hours, blocked, booked]) if (result.error !== null) throw result.error

  const opensAt = (hours.data?.opens_at as string | null | undefined)?.slice(0, 5)
  const closesAt = (hours.data?.closes_at as string | null | undefined)?.slice(0, 5)
  if (opensAt == null || closesAt == null) return false
  const withinHours = booking.time >= opensAt && booking.time < closesAt
  return withinHours && blocked.data === null && booked.data === null
}

/// The client behind the phone: a new account, an existing one whose NIP matches, or a refusal.
async function clientFor(
  admin: SupabaseClient,
  booking: Booking,
): Promise<ClientRow | 'rejected' | 'throttled' | 'without_nip'> {
  const existing = await clientWithPhone(admin, booking.phone)
  if (existing === null) return (await newClient(admin, booking)) ?? (await clientFor(admin, booking))
  if (existing.nip_hash === null) return 'without_nip'
  // The same per-phone claim as sign-in, so booking is no way around it.
  if (!(await claimNipAttempt(admin, booking.phone))) return 'throttled'
  return (await nipMatches(booking.nip, existing.nip_hash)) ? existing : 'rejected'
}

/// Null when the phone was registered meanwhile, so the caller treats it as an existing account.
async function newClient(admin: SupabaseClient, booking: Booking): Promise<ClientRow | null> {
  const { data, error } = await admin
    .from('clients')
    .insert({ name: booking.name, phone: booking.phone, nip_hash: await hashNip(booking.nip) })
    .select('id, name, phone, nip_hash, user_id')
    .single()
  if (error?.code === '23505') return null
  if (error !== null) throw error
  return data as ClientRow
}

/// 4 random digits that no active ticket uses: open orders and appointments still to come.
async function freeTicket(admin: SupabaseClient): Promise<string> {
  const { today } = cancunClock()
  const [orders, appointments] = await Promise.all([
    admin.from('orders').select('ticket').not('status', 'in', '(delivered,cancelled)'),
    admin.from('appointments').select('ticket').gte('scheduled_date', today),
  ])
  if (orders.error !== null) throw orders.error
  if (appointments.error !== null) throw appointments.error
  const taken = new Set([...orders.data, ...appointments.data].map((row) => row.ticket as string))

  for (let attempt = 0; attempt < 100; attempt++) {
    const ticket = String(crypto.getRandomValues(new Uint32Array(1))[0] % TICKET_COUNT).padStart(4, '0')
    if (!taken.has(ticket)) return ticket
  }
  throw new Error('No free ticket left')
}

/// Cancún keeps UTC−5 all year.
function cancunClock(): { today: string; nowTime: string } {
  const cancun = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
  return { today: cancun.slice(0, 10), nowTime: cancun.slice(11, 16) }
}

function addDays(date: string, days: number): string {
  const moment = new Date(`${date}T00:00:00Z`)
  moment.setUTCDate(moment.getUTCDate() + days)
  return moment.toISOString().slice(0, 10)
}
