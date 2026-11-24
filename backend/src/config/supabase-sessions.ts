import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import type { ClientSessions } from '../types/client-app.js'

const SERVER_SIDE = { auth: { persistSession: false, autoRefreshToken: false } }

// The client app's Supabase Auth users and sessions, as the retired client-sign-in Edge Function
// made them. Creating users and minting magic links needs the service role key, which only the
// server holds. https://supabase.com/docs/reference/javascript/auth-admin-generatelink
export function supabaseClientSessions(supabaseUrl: string, serviceRoleKey: string, publishableKey: string): ClientSessions {
  const admin = createClient(supabaseUrl, serviceRoleKey, SERVER_SIDE)

  return {
    async createAuthUser(email, clientId) {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        // Nobody signs in with it: her phone and NIP are her credentials.
        password: randomUUID() + randomUUID(),
        // app_metadata, which only the service role can write, says whose auth user this is;
        // orphaned_auth_user_id reads it. A number, as the Edge Function stored it.
        app_metadata: { client_id: Number(clientId) },
      })
      if (error !== null) throw error
      return data.user.id
    },

    // A magic link minted and redeemed here, never sent by mail; the app exchanges the refresh
    // token for a session of its own.
    async refreshTokenFor(userId) {
      const { data: found } = await admin.auth.admin.getUserById(userId)
      const email = found.user?.email
      if (email === undefined) return null

      const link = await admin.auth.admin.generateLink({ type: 'magiclink', email })
      const tokenHash = link.data.properties?.hashed_token
      if (link.error !== null || tokenHash === undefined) return null

      // A client of its own each time: verifyOtp keeps the session it opens in that client.
      const visitor = createClient(supabaseUrl, publishableKey, SERVER_SIDE)
      const redeemed = await visitor.auth.verifyOtp({ token_hash: tokenHash, type: 'email' })
      if (redeemed.error !== null || redeemed.data.session === null) return null
      return redeemed.data.session.refresh_token
    },
  }
}
