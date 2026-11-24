import { createClient } from '@supabase/supabase-js'
import type { Identity } from '../types/auth.js'

// Supabase Auth checks the token itself, so the server needs no JWT secret.
// https://supabase.com/docs/reference/javascript/auth-getuser
export function supabaseIdentity(supabaseUrl: string, publishableKey: string): Identity {
  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return {
    async userIdForToken(token) {
      const { data, error } = await client.auth.getUser(token)
      if (error === null) return data.user.id
      if (isRejectedToken(error.status)) return null
      throw error
    },
  }
}

// A 4xx means the token is wrong or expired. Anything else is Supabase failing: a 5xx, a 429
// (rate limit) or status 0, which supabase-js reports when it cannot reach the server.
function isRejectedToken(status: number | undefined): boolean {
  return status !== undefined && status >= 400 && status < 500 && status !== 429
}
