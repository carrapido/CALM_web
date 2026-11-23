// What every client-facing function needs to know who is asking: the phone and NIP check, its
// per-phone throttle, and the session the app installs afterwards.
//
// The NIP is verified here and nowhere else: `clients.nip_hash` holds an argon2id hash, the raw
// NIP never reaches the database, and the app never stores it.
// Spec: CALM_mobile odd/tasks/acceso-cliente-supabase.md, odd/tasks/acciones-cliente.md.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { argon2id, argon2Verify } from 'npm:hash-wasm@4'

export const PHONE_PATTERN = /^\d{10}$/
export const NIP_PATTERN = /^\d{4}$/

// Answered to every rejected pair, so a wrong NIP and an unknown phone look the same.
export const REJECTED = 'Tu celular o tu NIP no coinciden.'
export const THROTTLED = 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
export const UNAVAILABLE = 'No pudimos abrir tu sesión. Inténtalo de nuevo.'

// Verified against when the phone has no NIP, so answering takes about as long either way.
const DECOY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$hjQlfpqkLALK0NuPZmC2VA$lzOmu8EsFiCoxXDQ5lXPdg+ZBdshUNG00nHtgb3KIjo'

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

export type ClientRow = {
  id: number
  name: string
  phone: string | null
  nip_hash: string | null
  user_id: string | null
}

export function digitsOf(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}

/// The service role bypasses row level security: it is the only way to read `nip_hash` and to link
/// a client to her auth user. It lives in the function's environment, never in the app.
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/// `clients.phone` is unique, so a phone names at most one client.
export async function clientWithPhone(admin: SupabaseClient, phone: string): Promise<ClientRow | null> {
  const { data, error } = await admin
    .from('clients')
    .select('id, name, phone, nip_hash, user_id')
    .eq('phone', phone)
    .maybeSingle()
  if (error !== null) throw error
  return (data as ClientRow | null) ?? null
}

export async function nipMatches(nip: string, hash: string | null): Promise<boolean> {
  // A phone with no NIP still pays for a verification, so the answer takes about as long.
  const matched = await argon2Verify({ password: nip, hash: hash ?? DECOY_HASH }).catch(() => false)
  return hash !== null && matched
}

/// The same parameters every stored NIP was hashed with.
export function hashNip(nip: string): Promise<string> {
  return argon2id({
    password: nip,
    salt: crypto.getRandomValues(new Uint8Array(16)),
    parallelism: 1,
    iterations: 2,
    memorySize: 19456,
    hashLength: 32,
    outputType: 'encoded',
  })
}

/// Counts a NIP check against [phone] before it runs, and says whether it may run: five checks per
/// phone until a right NIP clears them, then fifteen minutes of lockout. One atomic statement in
/// the database (`claim_nip_attempt`), so a burst of concurrent requests cannot all slip past the
/// count; and a database error refuses the check instead of letting it through.
export async function claimNipAttempt(admin: SupabaseClient, phone: string): Promise<boolean> {
  const { data, error } = await admin.rpc('claim_nip_attempt', { p_phone: phone })
  if (error !== null) throw error
  return data === true
}

export async function clearFailures(admin: SupabaseClient, phone: string): Promise<void> {
  await admin.from('sign_in_attempts').delete().eq('phone', phone)
}

/// Her auth user, created on her first sign-in and remembered in `clients.user_id`.
export async function authUserIdOf(admin: SupabaseClient, client: ClientRow): Promise<string> {
  if (client.user_id !== null) return client.user_id

  // Supabase Auth needs an identifier of its own; the phone remains the real identity, and this
  // alias is never shown to anyone nor used to send mail.
  const email = `${client.phone}@clients.calm.app`
  const userId = (await orphanedAuthUserId(admin, email, client.id)) ?? (await createdAuthUserId(admin, client, email))
  const linked = await admin.from('clients').update({ user_id: userId }).eq('id', client.id)
  if (linked.error !== null) throw linked.error
  return userId
}

/// The auth user an earlier request created for this same client and then failed to link; reused
/// rather than created again, which Auth would refuse for the same email. Only her own and only
/// unlinked: an auth user left by another client who held the phone is never handed to her.
async function orphanedAuthUserId(admin: SupabaseClient, email: string, clientId: number): Promise<string | null> {
  const { data, error } = await admin.rpc('orphaned_auth_user_id', { p_email: email, p_client_id: clientId })
  if (error !== null) throw error
  return (data as string | null) ?? null
}

async function createdAuthUserId(admin: SupabaseClient, client: ClientRow, email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
    // app_metadata, which only the service role can write: it says whose this auth user is.
    app_metadata: { client_id: client.id },
  })
  if (error !== null || data.user === null) throw error ?? new Error('No se pudo crear el usuario')
  return data.user.id
}

/// A refresh token for her, without a password: a magic link is minted and redeemed here, never
/// sent by mail. The app exchanges it for a session of its own.
export async function refreshTokenFor(admin: SupabaseClient, userId: string): Promise<string | null> {
  const { data: user } = await admin.auth.admin.getUserById(userId)
  const email = user.user?.email
  if (email === undefined) return null

  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email })
  const tokenHash = link.data.properties?.hashed_token
  if (link.error !== null || tokenHash === undefined) return null

  const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const redeemed = await anon.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
  if (redeemed.error !== null || redeemed.data.session === null) return null
  return redeemed.data.session.refresh_token
}

export function clientSummary(client: ClientRow) {
  return { id: client.id, name: client.name, phone: client.phone }
}

export function problem(status: number, message: string, code?: string): Response {
  return answer(status, code === undefined ? { error: message } : { error: message, code })
}

export function answer(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/// Runs [handle] for a POST, answering the CORS preflight, and turns anything it throws into one
/// wording while the detail goes to the function log, never to the caller.
export function serveClientFunction(name: string, handle: (request: Request) => Promise<Response>) {
  Deno.serve(async (request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
    if (request.method !== 'POST') return problem(405, 'Método no permitido.')
    try {
      return await handle(request)
    } catch (failure) {
      console.error(`${name} failed`, failure)
      return problem(500, UNAVAILABLE)
    }
  })
}
