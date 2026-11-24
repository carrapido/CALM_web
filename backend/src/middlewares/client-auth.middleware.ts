import type { Request, RequestHandler } from 'express'
import type { Identity } from '../types/auth.js'
import type { ClientAppRepository, SignedInClient } from '../types/client-app.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { SIGNED_OUT } from '../utils/client-auth.js'
import { bearerTokenOf } from './auth.middleware.js'

// The client app's guard: a valid Supabase Auth token whose user is linked to a client. An admin
// is not a client, so her token is refused here as a client's is refused by requireAdmin.
export function requireClient(identity: Identity, clientApp: ClientAppRepository): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const client = await signedInClientOf(req, identity, clientApp)
    if (client === null) throw SIGNED_OUT
    req.client = client
    next()
  })
}

// Null without a token, with one Supabase Auth rejects, or for a user who is not a client.
export async function signedInClientOf(
  req: Request,
  identity: Identity,
  clientApp: ClientAppRepository,
): Promise<SignedInClient | null> {
  const token = bearerTokenOf(req.headers.authorization)
  const userId = token === null ? null : await identity.userIdForToken(token)
  if (userId === null) return null
  const client = await clientApp.signedInClient(userId)
  return client === null ? null : { ...client, userId }
}
