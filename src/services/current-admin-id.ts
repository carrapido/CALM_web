import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types/database.types'

// Writes that name the admin (`updated_by`, `blocked_by`) take her id from her session.
// https://supabase.com/docs/reference/javascript/auth-getsession
export async function currentAdminIdOf(client: SupabaseClient<Database>): Promise<string> {
  const { data, error } = await client.auth.getSession()
  if (error) throw error
  const userId = data.session?.user.id
  if (userId === undefined) throw new Error('No hay una sesión de administradora')
  return userId
}
