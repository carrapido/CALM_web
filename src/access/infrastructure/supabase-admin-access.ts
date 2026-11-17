import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdminAccess, SignInOutcome } from '../application/admin-access'
import type { AdminCredentials } from '../domain/admin-credentials'
import { panelEmailFor, signInOutcomeFor } from './supabase-sign-in'

// supabase-js keeps the session in local storage and refreshes it
// (https://supabase.com/docs/reference/javascript/initializing).
export class SupabaseAdminAccess implements AdminAccess {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  // https://supabase.com/docs/reference/javascript/auth-getsession
  async hasSession(): Promise<boolean> {
    const { data } = await this.client.auth.getSession()
    if (data.session === null) return false
    if (await this.isAdmin(data.session.user.id)) return true

    // A stored session that is not an admin's must not stay in this browser.
    await this.signOut()
    return false
  }

  // https://supabase.com/docs/reference/javascript/auth-signinwithpassword
  async signIn({ phone, password }: AdminCredentials): Promise<SignInOutcome> {
    const { data, error } = await this.client.auth.signInWithPassword({
      email: panelEmailFor(phone),
      password,
    })
    if (error) return signInOutcomeFor(error)
    if (await this.isAdmin(data.user.id)) return 'signedIn'

    await this.signOut()
    return 'notAnAdmin'
  }

  // Local scope ends only this browser's session: signing out on the computer keeps her
  // phone signed in. https://supabase.com/docs/reference/javascript/auth-signout
  async signOut(): Promise<void> {
    await this.client.auth.signOut({ scope: 'local' })
  }

  // https://supabase.com/docs/reference/javascript/auth-onauthstatechange
  onSessionEnd(listener: () => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') listener()
    })
    return () => data.subscription.unsubscribe()
  }

  // The policy "An admin reads her own row" shows her exactly that row (objective 12).
  private async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await this.client
      .from('admins')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
    if (error) throw error
    return data !== null
  }
}
