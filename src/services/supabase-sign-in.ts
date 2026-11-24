import { isAuthApiError, type AuthError } from '@supabase/supabase-js'
import type { SignInOutcome } from './admin-access'

// Supabase Auth signs in with an email; the admin only knows her phone. A `.invalid`
// address never receives mail (RFC 2606), so it only names the account
// (odd/tasks/acceso-supabase.md).
export function panelEmailFor(phone: string): string {
  return `${phone}@panel.calm.invalid`
}

const TOO_MANY_REQUESTS = 429

// https://supabase.com/docs/guides/auth/debugging/error-codes. Errors that never reached
// the server, such as a failed fetch, are not API errors.
export function signInOutcomeFor(error: AuthError): SignInOutcome {
  if (!isAuthApiError(error)) return 'unavailable'
  if (error.code === 'invalid_credentials') return 'wrongCredentials'
  if (error.code === 'over_request_rate_limit' || error.status === TOO_MANY_REQUESTS) {
    return 'tooManyAttempts'
  }
  return 'unavailable'
}
