import type { RequestHandler } from 'express'
import type { AdminRepository, Identity } from '../types/auth.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { HttpError } from '../utils/http-error.js'

// The backend reaches Postgres as a role that skips RLS, so this check is the only guard:
// a valid Supabase Auth token whose user is in `admins`.
export function requireAdmin(identity: Identity, admins: AdminRepository): RequestHandler {
  return asyncHandler(async (req, _res, next) => {
    const token = bearerTokenOf(req.headers.authorization)
    const userId = token === null ? null : await identity.userIdForToken(token)
    if (userId === null) {
      throw new HttpError(401, 'unauthenticated', 'Inicia sesión para continuar.')
    }
    if (!(await admins.isAdmin(userId))) {
      throw new HttpError(403, 'not_admin', 'Esta cuenta no tiene acceso al panel de administración.')
    }
    req.adminId = userId
    next()
  })
}

export function bearerTokenOf(header: string | undefined): string | null {
  const match = /^Bearer (\S+)$/.exec(header ?? '')
  return match?.[1] ?? null
}
