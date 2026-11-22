// Signs the client app in with her phone and her 4-digit NIP, and answers with a refresh token the
// app installs. From then on row level security, not this function, decides what she reaches.
//
// Spec: CALM_mobile odd/tasks/acceso-cliente-supabase.md (S1, S2, S6, S7).
import {
  adminClient,
  answer,
  authUserIdOf,
  clearFailures,
  clientSummary,
  clientWithPhone,
  countFailure,
  digitsOf,
  isLockedOut,
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

serveClientFunction('client-sign-in', async (request) => {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const phone = digitsOf(body?.phone)
  const nip = digitsOf(body?.nip)
  if (!PHONE_PATTERN.test(phone) || !NIP_PATTERN.test(nip)) {
    return problem(400, 'Escribe tu celular a 10 dígitos y tu NIP.')
  }

  const admin = adminClient()
  if (await isLockedOut(admin, phone)) return problem(429, THROTTLED)

  // Always verified, against a decoy when the phone is unknown, so the timing does not tell.
  const client = await clientWithPhone(admin, phone)
  if (!(await nipMatches(nip, client?.nip_hash ?? null))) {
    await countFailure(admin, phone)
    return problem(401, REJECTED)
  }

  // A match needs a stored hash, so the client exists here.
  const refreshToken = await refreshTokenFor(admin, await authUserIdOf(admin, client!))
  if (refreshToken === null) return problem(500, UNAVAILABLE)

  await clearFailures(admin, phone)
  return answer(200, { refresh_token: refreshToken, client: clientSummary(client!) })
})
