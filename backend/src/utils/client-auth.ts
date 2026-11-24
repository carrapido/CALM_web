// What every client app route needs to know who is asking: the NIP check under its per-phone
// throttle, and the session the app installs afterwards. The rules and wording of the retired
// supabase/functions/_shared/client-auth.ts.
import type {
  ClientAccount, ClientAppRepository, ClientSessions, StoredCredentials,
} from '../types/client-app.js'
import { HttpError } from './http-error.js'
import { nipMatches } from './nip.js'

export const SIGNED_OUT = new HttpError(401, 'signed_out', 'Tu sesión terminó. Vuelve a entrar.')
// Answered to every rejected pair, so a wrong NIP and an unknown phone look the same.
export const REJECTED = new HttpError(401, 'rejected', 'Tu celular o tu NIP no coinciden.')
export const THROTTLED = new HttpError(429, 'throttled', 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
const SESSION_UNAVAILABLE = new HttpError(500, 'unavailable', 'No pudimos abrir tu sesión. Inténtalo de nuevo.')

// Claims the check before it runs, so concurrent guesses are counted one by one: five per phone
// until a right NIP clears them, then fifteen minutes of lockout (claim_nip_attempt).
export async function isNipRight(
  clientApp: ClientAppRepository,
  phone: string,
  nip: string,
  nipHash: string | null,
): Promise<boolean> {
  if (!(await clientApp.claimNipAttempt(phone))) throw THROTTLED
  return nipMatches(nip, nipHash)
}

// A refresh token for her, without a password; her auth user is created and linked the first time.
export async function refreshTokenFor(
  { client, userId }: Pick<StoredCredentials, 'client' | 'userId'>,
  clientApp: ClientAppRepository,
  clientSessions: ClientSessions,
): Promise<string> {
  const authUserId = userId ?? (await linkedAuthUserId(client, clientApp, clientSessions))
  const refreshToken = await clientSessions.refreshTokenFor(authUserId)
  if (refreshToken === null) throw SESSION_UNAVAILABLE
  return refreshToken
}

// An auth user an earlier request created for her and failed to link is reused, since Auth would
// refuse to create a second one with the same email.
async function linkedAuthUserId(
  client: ClientAccount,
  clientApp: ClientAppRepository,
  clientSessions: ClientSessions,
): Promise<string> {
  const email = authEmailOf(client.phone)
  const userId = (await clientApp.orphanedAuthUserId(email, client.id))
    ?? (await clientSessions.createAuthUser(email, client.id))
  await clientApp.linkAuthUser(client.id, userId)
  return userId
}

// Supabase Auth needs an identifier of its own; the phone remains her identity, and this alias is
// never shown to anyone nor used to send mail.
export function authEmailOf(phone: string): string {
  return `${phone}@clients.calm.app`
}
