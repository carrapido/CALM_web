// Saves Perfil: the phone the client signs in with and, when she asks, a new NIP.
//
// Her session says who she is; the current NIP is checked here, under the same per-phone throttle
// as sign-in, before a new one is stored. Spec: CALM_mobile odd/tasks/acciones-cliente.md (S8).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  adminClient,
  answer,
  claimNipAttempt,
  clearFailures,
  type ClientRow,
  clientSummary,
  digitsOf,
  hashNip,
  NIP_PATTERN,
  nipMatches,
  PHONE_PATTERN,
  problem,
  serveClientFunction,
  THROTTLED,
} from '../_shared/client-auth.ts'

const SIGNED_OUT = 'Tu sesión terminó. Vuelve a entrar.'
// The wording of Perfil's own form, so a refusal reads the same whoever catches it.
const CURRENT_NIP_WRONG = 'Tu NIP actual no coincide.'
const NEW_NIP_SHORT = 'El NIP nuevo necesita 4 dígitos.'
const NEW_NIP_SAME = 'El NIP nuevo debe ser distinto del actual.'
const PHONE_SHORT = 'Escribe tu celular a 10 dígitos.'
const PHONE_TAKEN = 'Ese celular ya lo usa otra cuenta.'

serveClientFunction('client-update-profile', async (request) => {
  const admin = adminClient()
  const client = await signedInClient(admin, request)
  if (client === null) return problem(401, SIGNED_OUT, 'signed_out')

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const phone = digitsOf(body?.phone)
  const currentNip = digitsOf(body?.current_nip)
  const newNip = digitsOf(body?.new_nip)
  if (!PHONE_PATTERN.test(phone)) return problem(400, PHONE_SHORT, 'phone')

  const changes: Record<string, string> = {}
  if (phone !== client.phone) changes.phone = phone

  const changesNip = currentNip !== '' || newNip !== ''
  if (changesNip) {
    const signInPhone = client.phone!
    if (!(await claimNipAttempt(admin, signInPhone))) return problem(429, THROTTLED)
    if (!(await nipMatches(currentNip, client.nip_hash))) {
      return problem(401, CURRENT_NIP_WRONG, 'current_nip')
    }
    await clearFailures(admin, signInPhone)
    if (!NIP_PATTERN.test(newNip)) return problem(400, NEW_NIP_SHORT, 'new_nip')
    if (newNip === currentNip) return problem(400, NEW_NIP_SAME, 'new_nip')
    changes.nip_hash = await hashNip(newNip)
  }

  if (Object.keys(changes).length === 0) return answer(200, { client: clientSummary(client) })

  const { data, error } = await admin
    .from('clients')
    .update(changes)
    .eq('id', client.id)
    .select('id, name, phone, nip_hash, user_id')
    .single()
  if (error?.code === '23505') return problem(409, PHONE_TAKEN, 'phone_taken')
  if (error !== null) throw error

  // Her auth user is named after the phone; keep it in step, or a new client signing up with the
  // old phone later could not get an auth user of her own.
  if (changes.phone !== undefined) {
    const renamed = await admin.auth.admin.updateUserById(client.user_id!, {
      email: `${phone}@clients.calm.app`,
      email_confirm: true,
    })
    if (renamed.error !== null) throw renamed.error
  }
  return answer(200, { client: clientSummary(data as ClientRow) })
})

/// The client behind the bearer token of [request], or null when there is no valid session.
async function signedInClient(admin: SupabaseClient, request: Request): Promise<ClientRow | null> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (token === '') return null
  const { data, error } = await admin.auth.getUser(token)
  if (error !== null || data.user === null) return null

  const client = await admin
    .from('clients')
    .select('id, name, phone, nip_hash, user_id')
    .eq('user_id', data.user.id)
    .maybeSingle()
  if (client.error !== null) throw client.error
  return (client.data as ClientRow | null) ?? null
}
