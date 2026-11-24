// Gives clients access to the app from the panel, as the admin-enroll-client Edge Function did:
// a new client with the NIP she dictates at the counter, or an existing one who gets a NIP, or a
// new one when she forgot hers. The NIP is hashed here and never stored as typed.
import type { Request, Response } from 'express'
import type { AuthAccounts, ClientRepository } from '../types/client.js'
import { HttpError } from '../utils/http-error.js'
import { isRecord } from '../utils/is-record.js'
import { hashNip } from '../utils/nip.js'

const PHONE_PATTERN = /^\d{10}$/
const NIP_PATTERN = /^\d{4}$/
const MAX_NAME_LENGTH = 80

// The codes name the form field, which the panel highlights.
const PHONE_TAKEN = new HttpError(409, 'phone_taken', 'Ese celular ya es de otro cliente.')
const CLIENT_NOT_FOUND = new HttpError(404, 'not_found', 'Ese cliente ya no existe.')

type Credentials = { phone: string; nip: string }

export function clientController(clients: ClientRepository, authAccounts: AuthAccounts) {
  return {
    async list(_req: Request, res: Response): Promise<void> {
      res.json(await clients.all())
    },

    async create(req: Request, res: Response): Promise<void> {
      const { phone, nip } = credentialsOf(req.body)
      const name = nameOf(req.body)
      const added = await clients.add({ name, phone, nipHash: await hashNip(nip) })
      if (added === 'phoneTaken') throw PHONE_TAKEN
      res.status(201).json({ client: added })
    },

    async grantAccess(req: Request, res: Response): Promise<void> {
      const clientId = clientIdOf(req)
      const { phone, nip } = credentialsOf(req.body)
      const granted = await clients.grantAccess({ clientId, phone, nipHash: await hashNip(nip) })
      if (granted === 'notFound') throw CLIENT_NOT_FOUND
      if (granted === 'phoneTaken') throw PHONE_TAKEN
      // Her auth user is named after her phone; it changes only once the database has the new one.
      if (granted.authUserToRename !== null) {
        await authAccounts.updateEmail(granted.authUserToRename, `${phone}@clients.calm.app`)
      }
      res.json({ client: granted.client })
    },
  }
}

function clientIdOf(req: Request): string {
  const id = req.params.id
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
    throw new HttpError(400, 'invalid_input', 'El identificador del cliente no es válido.')
  }
  return id
}

// The phone is checked before the NIP, as the Edge Function did. "998 123-4567" is a valid phone.
function credentialsOf(body: unknown): Credentials {
  const fields = isRecord(body) ? body : {}
  const phone = digitsOf(fields.phone)
  if (!PHONE_PATTERN.test(phone)) throw new HttpError(400, 'phone', 'Escribe el celular a 10 dígitos.')
  const nip = digitsOf(fields.nip)
  if (!NIP_PATTERN.test(nip)) throw new HttpError(400, 'nip', 'El NIP necesita 4 dígitos.')
  return { phone, nip }
}

function nameOf(body: unknown): string {
  const value = isRecord(body) ? body.name : undefined
  const name = typeof value === 'string' ? value.trim() : ''
  if (name === '' || name.length > MAX_NAME_LENGTH) {
    throw new HttpError(400, 'name', 'Escribe el nombre del cliente.')
  }
  return name
}

function digitsOf(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}
