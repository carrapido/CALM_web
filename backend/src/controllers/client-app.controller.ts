// The client app's sign-in, reads and actions, with the rules of the retired client-sign-in and
// client-update-profile Edge Functions and the cancel_my_appointment and mark_on_my_way RPCs.
// Booking has its own controller.
import type { Request, Response } from 'express'
import type {
  ClientAccount, ClientAppDependencies, ClientAppRepository, SignedInClient,
} from '../types/client-app.js'
import {
  authEmailOf, isNipRight, refreshTokenFor, REJECTED,
} from '../utils/client-auth.js'
import { HttpError } from '../utils/http-error.js'
import { isRecord } from '../utils/is-record.js'
import { hashNip } from '../utils/nip.js'
import { digitsOf, NIP_PATTERN, PHONE_PATTERN } from '../utils/validation.js'

const SIGN_IN_PROBLEM = 'Escribe tu celular a 10 dígitos y tu NIP.'
// The wording of Perfil's own form, so a refusal reads the same whoever catches it.
const PHONE_SHORT = new HttpError(400, 'phone', 'Escribe tu celular a 10 dígitos.')
const PHONE_TAKEN = new HttpError(409, 'phone_taken', 'Ese celular ya lo usa otra cuenta.')
const CURRENT_NIP_WRONG = new HttpError(401, 'current_nip', 'Tu NIP actual no coincide.')
const NEW_NIP_SHORT = new HttpError(400, 'new_nip', 'El NIP nuevo necesita 4 dígitos.')
const NEW_NIP_SAME = new HttpError(400, 'new_nip', 'El NIP nuevo debe ser distinto del actual.')
// The app's own wording for these refusals (calm_mobil lib/utils/app_constants.dart).
const APPOINTMENT_NOT_CANCELLABLE = new HttpError(
  409,
  'appointment_not_cancellable',
  'Ya no se puede cancelar desde la app: escríbele al taller.',
)
const ORDER_NOT_READY = new HttpError(409, 'order_not_ready', 'Tu pedido ya no está listo para recoger. Escríbele al taller.')

export function clientAppController({ clientApp, clientSessions, authAccounts }: ClientAppDependencies) {
  return {
    // Always verified, against a decoy when the phone is unknown, so the timing does not tell.
    async signIn(req: Request, res: Response): Promise<void> {
      const { phone, nip } = signInCredentialsOf(req.body)
      const stored = await clientApp.credentialsOf(phone)
      const isRight = await isNipRight(clientApp, phone, nip, stored?.nipHash ?? null)
      if (!isRight || stored === null) throw REJECTED

      const refreshToken = await refreshTokenFor(stored, clientApp, clientSessions)
      await clientApp.clearSignInAttempts(phone)
      res.json({ refreshToken, client: stored.client })
    },

    async services(_req: Request, res: Response): Promise<void> {
      res.json(await clientApp.activeServices())
    },

    async bookingCalendar(_req: Request, res: Response): Promise<void> {
      res.json(await clientApp.bookingCalendar())
    },

    async profile(req: Request, res: Response): Promise<void> {
      const { name, phone } = signedInClientOf(req)
      res.json({ name, phone })
    },

    async orders(req: Request, res: Response): Promise<void> {
      res.json(await clientApp.ordersOf(signedInClientOf(req).id))
    },

    async cancelAppointment(req: Request, res: Response): Promise<void> {
      if (!(await clientApp.cancelAppointment(signedInClientOf(req).id, ticketParamOf(req)))) {
        throw APPOINTMENT_NOT_CANCELLABLE
      }
      res.status(204).send()
    },

    async markOnMyWay(req: Request, res: Response): Promise<void> {
      if (!(await clientApp.markOnMyWay(signedInClientOf(req).id, ticketParamOf(req)))) throw ORDER_NOT_READY
      res.status(204).send()
    },

    // Her auth user is named after her phone; it changes only once the database has the new one.
    async updateProfile(req: Request, res: Response): Promise<void> {
      const client = signedInClientOf(req)
      const fields = isRecord(req.body) ? req.body : {}
      const phone = digitsOf(fields.phone)
      if (!PHONE_PATTERN.test(phone)) throw PHONE_SHORT
      const nipHash = await newNipHashOf(clientApp, client, digitsOf(fields.currentNip), digitsOf(fields.newNip))
      if (phone === client.phone && nipHash === null) {
        res.json({ client: accountOf(client) })
        return
      }

      const updated = await clientApp.updateProfile(client.id, { phone, nipHash })
      if (updated === 'phoneTaken') throw PHONE_TAKEN
      if (phone !== client.phone) await authAccounts.updateEmail(client.userId, authEmailOf(phone))
      res.json({ client: updated })
    },
  }
}

// The phone is checked before the NIP; both answer the same wording.
function signInCredentialsOf(body: unknown): { phone: string; nip: string } {
  const fields = isRecord(body) ? body : {}
  const phone = digitsOf(fields.phone)
  if (!PHONE_PATTERN.test(phone)) throw new HttpError(400, 'phone', SIGN_IN_PROBLEM)
  const nip = digitsOf(fields.nip)
  if (!NIP_PATTERN.test(nip)) throw new HttpError(400, 'nip', SIGN_IN_PROBLEM)
  return { phone, nip }
}

// requireClient runs before every route that reads it and always sets it.
function signedInClientOf(req: Request): SignedInClient {
  if (req.client === undefined) throw new Error('This client route needs requireClient before it')
  return req.client
}

// Any text goes to the database as a parameter; a ticket that is not hers simply matches nothing.
function ticketParamOf(req: Request): string {
  const { ticket } = req.params
  return typeof ticket === 'string' ? ticket : ''
}

// Null when she keeps her NIP. The current one is checked under the throttle of the phone she
// signs in with, before the new one is accepted.
async function newNipHashOf(
  clientApp: ClientAppRepository,
  client: SignedInClient,
  currentNip: string,
  newNip: string,
): Promise<string | null> {
  if (currentNip === '' && newNip === '') return null
  const stored = await clientApp.credentialsOf(client.phone)
  if (!(await isNipRight(clientApp, client.phone, currentNip, stored?.nipHash ?? null))) throw CURRENT_NIP_WRONG
  await clientApp.clearSignInAttempts(client.phone)
  if (!NIP_PATTERN.test(newNip)) throw NEW_NIP_SHORT
  if (newNip === currentNip) throw NEW_NIP_SAME
  return hashNip(newNip)
}

function accountOf({ id, name, phone }: SignedInClient): ClientAccount {
  return { id, name, phone }
}
