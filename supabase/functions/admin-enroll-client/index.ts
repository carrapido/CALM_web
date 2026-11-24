// Lets the admin give a client access to the app from the panel: a new client with her name, phone
// and the NIP she dictates at the counter, or an existing client who gets a NIP, or a new one when
// she forgot hers. Only the admin may call it; the NIP is hashed here and never stored as typed.
//
// Spec: CALM_mobile odd/tasks/panel-y-ajustes.md (S2).
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import {
  adminClient,
  answer,
  clearFailures,
  type ClientRow,
  digitsOf,
  hashNip,
  NIP_PATTERN,
  PHONE_PATTERN,
  problem,
  serveClientFunction,
} from '../_shared/client-auth.ts'

const NOT_ADMIN = 'Solo la administradora puede dar acceso a la app.'
const NAME_MISSING = 'Escribe el nombre del cliente.'
const PHONE_SHORT = 'Escribe el celular a 10 dígitos.'
const NIP_SHORT = 'El NIP necesita 4 dígitos.'
const PHONE_TAKEN = 'Ese celular ya es de otro cliente.'
const NOT_FOUND = 'Ese cliente ya no existe.'

serveClientFunction('admin-enroll-client', async (request) => {
  const admin = adminClient()
  if (!(await isAdminRequest(admin, request))) return problem(403, NOT_ADMIN, 'not_admin')

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const clientId = body?.client_id
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  const phone = digitsOf(body?.phone)
  const nip = digitsOf(body?.nip)
  if (!PHONE_PATTERN.test(phone)) return problem(400, PHONE_SHORT, 'phone')
  if (!NIP_PATTERN.test(nip)) return problem(400, NIP_SHORT, 'nip')

  if (clientId === undefined || clientId === null) {
    if (name === '' || name.length > 80) return problem(400, NAME_MISSING, 'name')
    return await enrollNewClient(admin, name, phone, nip)
  }
  if (!Number.isInteger(clientId)) return problem(400, NOT_FOUND, 'not_found')
  return await enrollExistingClient(admin, clientId as number, phone, nip)
})

async function enrollNewClient(admin: SupabaseClient, name: string, phone: string, nip: string) {
  const { data, error } = await admin
    .from('clients')
    .insert({ name, phone, nip_hash: await hashNip(nip) })
    .select('id, name, phone, nip_hash, user_id')
    .single()
  if (error?.code === '23505') return problem(409, PHONE_TAKEN, 'phone_taken')
  if (error !== null) throw error
  await clearFailures(admin, phone)
  return answer(200, { client: enrolled(data as ClientRow) })
}

/// A walk-in client gets a NIP; a client who forgot hers gets a new one. Her phone may change too.
async function enrollExistingClient(admin: SupabaseClient, clientId: number, phone: string, nip: string) {
  const existing = await admin
    .from('clients')
    .select('id, name, phone, nip_hash, user_id')
    .eq('id', clientId)
    .maybeSingle()
  if (existing.error !== null) throw existing.error
  const before = existing.data as ClientRow | null
  if (before === null) return problem(404, NOT_FOUND, 'not_found')

  const { data, error } = await admin
    .from('clients')
    .update({ phone, nip_hash: await hashNip(nip) })
    .eq('id', clientId)
    .select('id, name, phone, nip_hash, user_id')
    .single()
  if (error?.code === '23505') return problem(409, PHONE_TAKEN, 'phone_taken')
  if (error !== null) throw error

  // Her auth user is named after the phone; keep it in step, as PUT /api/client/profile does.
  if (before.user_id !== null && before.phone !== phone) {
    const renamed = await admin.auth.admin.updateUserById(before.user_id, {
      email: `${phone}@clients.calm.app`,
      email_confirm: true,
    })
    if (renamed.error !== null) throw renamed.error
  }
  // A fresh NIP starts with a clean slate: a lockout earned by the forgotten one is lifted.
  await clearFailures(admin, phone)
  if (before.phone !== null && before.phone !== phone) await clearFailures(admin, before.phone)
  return answer(200, { client: enrolled(data as ClientRow) })
}

function enrolled(client: ClientRow) {
  return { id: client.id, name: client.name, phone: client.phone, has_app_access: true }
}

/// The bearer token of [request] belongs to a user listed in `admins`.
async function isAdminRequest(admin: SupabaseClient, request: Request): Promise<boolean> {
  const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  if (token === '') return false
  const { data, error } = await admin.auth.getUser(token)
  if (error !== null || data.user === null) return false
  const row = await admin.from('admins').select('id').eq('id', data.user.id).maybeSingle()
  if (row.error !== null) throw row.error
  return row.data !== null
}
