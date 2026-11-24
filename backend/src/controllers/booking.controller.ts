// Books an appointment from the client app, as the retired client-book Edge Function did,
// creating her account when the phone is new.
//
// Everything is decided here, never by the app: the services must be active, the slot free under
// the panel's agenda rules, the total comes from the catalog and the ticket is drawn by the
// repository. A phone that already has an account needs its NIP, under the same per-phone throttle
// as sign-in; a phone with no NIP is refused, because knowing a phone alone never grants access.
// A signed-in client books with no contact, and only the contact path earns a refresh token.
import type { Request, Response } from 'express'
import { signedInClientOf } from '../middlewares/client-auth.middleware.js'
import type {
  CatalogService, ClientAccount, ClientAppDependencies, SignedInClient, StoredCredentials,
} from '../types/client-app.js'
import {
  isNipRight, refreshTokenFor, REJECTED, SIGNED_OUT,
} from '../utils/client-auth.js'
import { HttpError } from '../utils/http-error.js'
import { isRecord } from '../utils/is-record.js'
import { hashNip } from '../utils/nip.js'
import {
  digitsOf, isCalendarDate, isSlotTime, NIP_PATTERN, PHONE_PATTERN,
} from '../utils/validation.js'

const BAD_BOOKING = 'Revisa los datos de tu cita.'
const SLOT_TAKEN = new HttpError(409, 'slot_taken', 'Ese horario se acaba de ocupar. Elige otro.')
const PHONE_WITHOUT_NIP = new HttpError(
  409,
  'phone_without_nip',
  'Ese celular ya está registrado en el taller. Escríbele para que te dé tu NIP.',
)
const SERVICE_UNAVAILABLE = new HttpError(
  409,
  'service_unavailable',
  'Uno de tus arreglos ya no está disponible. Vuelve a elegirlos.',
)

const BOOKING_HORIZON_DAYS = 62
const MAX_SERVICES = 20
const MAX_NAME_LENGTH = 80
// Cancún keeps UTC−5 all year.
const CANCUN_OFFSET_MS = 5 * 60 * 60 * 1000

type Booking = { serviceIds: string[]; isUrgent: boolean; date: string; time: string }

// What a client without a session types, so her phone and NIP open or reach her account.
type Contact = { name: string; phone: string; nip: string }

type Booker = { contact: Contact } | { signedIn: SignedInClient }

type Quote = { serviceIds: string[]; totalMxn: number }

export function bookingController(dependencies: ClientAppDependencies) {
  const { identity, clientApp, clients, clientSessions, now } = dependencies

  return {
    async book(req: Request, res: Response): Promise<void> {
      const fields = isRecord(req.body) ? req.body : {}
      const booking = bookingOf(fields)
      const booker = await bookerOf(req, fields.contact)
      const quote = quoteOf(await clientApp.activeServices(), booking)
      if (quote === null) throw SERVICE_UNAVAILABLE
      if (!isWithinWindow(booking, now()) || !(await clientApp.isSlotOpen(booking.date, booking.time))) throw SLOT_TAKEN

      const credentials = 'signedIn' in booker ? signedInCredentials(booker.signedIn) : await contactCredentialsOf(booker.contact)
      const booked = await clientApp.book({
        clientId: credentials.client.id, date: booking.date, time: booking.time, ...quote,
      })
      if (booked === 'slotTaken') throw SLOT_TAKEN

      const answer = {
        ticket: booked.ticket,
        client: credentials.client,
        appointment: { date: booking.date, time: booking.time, totalMxn: quote.totalMxn },
      }
      // A session only proves who she is for as long as it lasts: it never earns a new one.
      if ('signedIn' in booker) {
        res.status(201).json(answer)
        return
      }
      await clientApp.clearSignInAttempts(booker.contact.phone)
      res.status(201).json({ ...answer, refreshToken: await refreshTokenFor(credentials, clientApp, clientSessions) })
    },
  }

  // The contact she typed decides, whatever token comes along; without one, her session must.
  async function bookerOf(req: Request, contactField: unknown): Promise<Booker> {
    const contact = contactOf(contactField)
    if (contact !== null) return { contact }
    const signedIn = await signedInClientOf(req, identity, clientApp)
    if (signedIn === null) throw SIGNED_OUT
    return { signedIn }
  }

  // A new phone becomes a client with her NIP; a known one must match its NIP.
  async function contactCredentialsOf(contact: Contact): Promise<Pick<StoredCredentials, 'client' | 'userId'>> {
    const stored = await clientApp.credentialsOf(contact.phone)
    if (stored === null) return (await newClientCredentials(contact)) ?? contactCredentialsOf(contact)
    if (stored.nipHash === null) throw PHONE_WITHOUT_NIP
    if (!(await isNipRight(clientApp, contact.phone, contact.nip, stored.nipHash))) throw REJECTED
    return stored
  }

  // Null when the phone was registered meanwhile, so the caller treats it as an existing account.
  async function newClientCredentials({ name, phone, nip }: Contact): Promise<Pick<StoredCredentials, 'client' | 'userId'> | null> {
    const added = await clients.add({ name, phone, nipHash: await hashNip(nip) })
    if (added === 'phoneTaken') return null
    return { client: { id: added.id, name: added.name, phone }, userId: null }
  }
}

function bookingOf(fields: Record<string, unknown>): Booking {
  return {
    serviceIds: serviceIdsOf(fields.serviceIds),
    isUrgent: fields.urgent === true,
    date: dateOf(fields.date),
    time: timeOf(fields.time),
  }
}

// Repeated ids count once; ids travel as text, like every other id of the API.
function serviceIdsOf(value: unknown): string[] {
  const ids = Array.isArray(value) ? value : []
  const isValid = ids.length > 0 && ids.length <= MAX_SERVICES && ids.every(isPositiveInteger)
  if (!isValid) throw badBooking('serviceIds')
  return [...new Set(ids.map(String))]
}

function isPositiveInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value > 0
}

function dateOf(value: unknown): string {
  if (!isCalendarDate(value)) throw badBooking('date')
  return value
}

function timeOf(value: unknown): string {
  if (!isSlotTime(value)) throw badBooking('time')
  return value
}

// Null when the app sent no contact; a contact it sent must be complete.
function contactOf(value: unknown): Contact | null {
  if (value === undefined || value === null) return null
  if (!isRecord(value)) throw badBooking('contact')
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  if (name === '' || name.length > MAX_NAME_LENGTH) throw badBooking('name')
  const phone = digitsOf(value.phone)
  if (!PHONE_PATTERN.test(phone)) throw badBooking('phone')
  const nip = digitsOf(value.nip)
  if (!NIP_PATTERN.test(nip)) throw badBooking('nip')
  return { name, phone, nip }
}

// The marked repairs, all of them active, plus the urgent charge when the garment is urgent and
// the workshop defined one. Null when a repair is no longer offered.
function quoteOf(services: CatalogService[], booking: Booking): Quote | null {
  const repairs = services.filter((service) => service.category === 'arreglo' && booking.serviceIds.includes(service.id))
  if (repairs.length !== booking.serviceIds.length) return null
  const urgentCharge = booking.isUrgent ? services.filter((service) => service.category === 'extra').slice(0, 1) : []
  const charged = [...repairs, ...urgentCharge]
  return {
    serviceIds: charged.map((service) => service.id),
    totalMxn: charged.reduce((sum, service) => sum + (service.basePriceMxn ?? 0), 0),
  }
}

// Not started yet on Cancún's wall clock, and at most 62 days ahead.
function isWithinWindow({ date, time }: Booking, moment: Date): boolean {
  const cancun = new Date(moment.getTime() - CANCUN_OFFSET_MS).toISOString()
  const today = cancun.slice(0, 10)
  if (date < today || date > daysAfter(today, BOOKING_HORIZON_DAYS)) return false
  return date !== today || time > cancun.slice(11, 16)
}

function daysAfter(date: string, days: number): string {
  const moment = new Date(`${date}T00:00:00Z`)
  moment.setUTCDate(moment.getUTCDate() + days)
  return moment.toISOString().slice(0, 10)
}

function signedInCredentials({ id, name, phone, userId }: SignedInClient): { client: ClientAccount; userId: string } {
  return { client: { id, name, phone }, userId }
}

function badBooking(field: string): HttpError {
  return new HttpError(400, field, BAD_BOOKING)
}
