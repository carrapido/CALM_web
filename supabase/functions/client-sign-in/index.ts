// Signs the client app in with her phone and her 4-digit NIP.
//
// The NIP is verified here and nowhere else: `clients.nip_hash` holds an argon2id hash, the raw
// NIP never reaches the database, and the app never stores it. The function answers with a
// Supabase session the app installs, so from then on row level security — not this function —
// decides what the client reaches.
//
// Spec: CALM_mobile odd/tasks/acceso-cliente-supabase.md (S1, S2, S6, S7).
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { argon2Verify } from 'npm:hash-wasm@4'

const PHONE_PATTERN = /^\d{10}$/
const NIP_PATTERN = /^\d{4}$/

// A phone is locked out after this many consecutive failures, for this long.
const MAX_FAILURES = 5
const LOCKOUT_MINUTES = 15

// Answered to every rejected attempt, so a wrong NIP and an unknown phone look the same (S6).
const REJECTED = 'Tu celular o tu NIP no coinciden.'

// Verified against when the phone is unknown, so answering takes about as long either way.
const DECOY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$hjQlfpqkLALK0NuPZmC2VA$lzOmu8EsFiCoxXDQ5lXPdg+ZBdshUNG00nHtgb3KIjo'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return problem(405, 'Método no permitido.')

  const credentials = await readCredentials(request)
  if (credentials === null) return problem(400, 'Escribe tu celular a 10 dígitos y tu NIP.')

  try {
    return await signIn(credentials)
  } catch (failure) {
    // Whatever broke stays here: the caller gets one wording, never an internal message.
    console.error('client-sign-in failed', failure)
    return problem(500, 'No pudimos abrir tu sesión. Inténtalo de nuevo.')
  }
})

async function signIn({ phone, nip }: Credentials): Promise<Response> {
  const admin = adminClient()

  if (await isLockedOut(admin, phone)) {
    return problem(429, 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.')
  }

  const client = await clientWithPhone(admin, phone)
  if (!(await nipMatches(nip, client?.nip_hash ?? null))) {
    await countFailure(admin, phone)
    return problem(401, REJECTED)
  }

  const userId = await authUserIdOf(admin, client!)
  const session = await sessionFor(admin, userId)
  if (session === null) return problem(500, 'No pudimos abrir tu sesión. Inténtalo de nuevo.')

  await clearFailures(admin, phone)
  // Only the refresh token travels: the app exchanges it for a session of its own.
  return answer(200, {
    refresh_token: session.refresh_token,
    client: { id: client!.id, name: client!.name, phone: client!.phone },
  })
}

type Credentials = { phone: string; nip: string }

type ClientRow = {
  id: number
  name: string
  phone: string | null
  nip_hash: string | null
  user_id: string | null
}

async function readCredentials(request: Request): Promise<Credentials | null> {
  const body = await request.json().catch(() => null)
  if (body === null || typeof body !== 'object') return null
  const phone = digitsOf((body as Record<string, unknown>).phone)
  const nip = digitsOf((body as Record<string, unknown>).nip)
  if (!PHONE_PATTERN.test(phone) || !NIP_PATTERN.test(nip)) return null
  return { phone, nip }
}

function digitsOf(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\D/g, '') : ''
}

function adminClient(): SupabaseClient {
  // The service role bypasses row level security: it is the only way to read `nip_hash` and to
  // link a client to her auth user. It lives in the function's environment, never in the app.
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function clientWithPhone(admin: SupabaseClient, phone: string): Promise<ClientRow | null> {
  // `clients.phone` is unique, so a phone names at most one client (S1).
  const { data } = await admin
    .from('clients')
    .select('id, name, phone, nip_hash, user_id')
    .eq('phone', phone)
    .maybeSingle()
  return (data as ClientRow | null) ?? null
}

async function nipMatches(nip: string, hash: string | null): Promise<boolean> {
  // An unknown phone still pays for a verification, so the answer takes about as long (S6).
  const matched = await argon2Verify({ password: nip, hash: hash ?? DECOY_HASH }).catch(() => false)
  return hash !== null && matched
}

/// Her auth user, created on her first sign-in and remembered in `clients.user_id`.
async function authUserIdOf(admin: SupabaseClient, client: ClientRow): Promise<string> {
  if (client.user_id !== null) return client.user_id

  // Supabase Auth needs an identifier of its own; the phone remains the real identity, and this
  // alias is never shown to anyone nor used to send mail.
  const { data, error } = await admin.auth.admin.createUser({
    email: aliasFor(client.phone!),
    email_confirm: true,
    password: crypto.randomUUID() + crypto.randomUUID(),
    user_metadata: { client_id: client.id },
  })
  if (error !== null || data.user === null) throw error ?? new Error('No se pudo crear el usuario')

  const linked = await admin.from('clients').update({ user_id: data.user.id }).eq('id', client.id)
  if (linked.error !== null) throw linked.error
  return data.user.id
}

function aliasFor(phone: string): string {
  return `${phone}@clients.calm.app`
}

type Session = { refresh_token: string }

/// A session without a password: a magic link is minted and redeemed here, never sent by mail.
async function sessionFor(admin: SupabaseClient, userId: string): Promise<Session | null> {
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
  const session = redeemed.data.session
  if (redeemed.error !== null || session === null) return null
  return { refresh_token: session.refresh_token }
}

async function isLockedOut(admin: SupabaseClient, phone: string): Promise<boolean> {
  const { data } = await admin
    .from('sign_in_attempts')
    .select('locked_until')
    .eq('phone', phone)
    .maybeSingle()
  const lockedUntil = (data as { locked_until: string | null } | null)?.locked_until
  return lockedUntil != null && new Date(lockedUntil) > new Date()
}

async function countFailure(admin: SupabaseClient, phone: string): Promise<void> {
  const { data } = await admin
    .from('sign_in_attempts')
    .select('failures')
    .eq('phone', phone)
    .maybeSingle()
  const failures = ((data as { failures: number } | null)?.failures ?? 0) + 1
  await admin.from('sign_in_attempts').upsert({
    phone,
    failures,
    locked_until: failures >= MAX_FAILURES ? lockoutEnd() : null,
  })
}

function lockoutEnd(): string {
  return new Date(Date.now() + LOCKOUT_MINUTES * 60_000).toISOString()
}

async function clearFailures(admin: SupabaseClient, phone: string): Promise<void> {
  await admin.from('sign_in_attempts').delete().eq('phone', phone)
}

function problem(status: number, message: string): Response {
  return answer(status, { error: message })
}

function answer(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
