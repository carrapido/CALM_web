import { createClient } from '@supabase/supabase-js'
import type { AuthAccounts } from '../types/client.js'

// Changing another user's email needs the service role key, which only the server holds.
// https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid
export function supabaseAuthAccounts(supabaseUrl: string, serviceRoleKey: string): AuthAccounts {
  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  return {
    async updateEmail(userId, email) {
      // Confirmed at once: the client signs in with her phone, never through this email.
      const { error } = await client.auth.admin.updateUserById(userId, { email, email_confirm: true })
      if (error !== null) throw error
    },
  }
}
