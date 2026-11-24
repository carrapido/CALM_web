import type { AdminCredentials } from '../utils/admin-credentials'

export type SignInOutcome =
  | 'signedIn'
  | 'wrongCredentials'
  | 'notAnAdmin'
  | 'tooManyAttempts'
  | 'unavailable'

// The admin's session in this browser. Supabase Auth provides it in the running app.
export interface AdminAccess {
  // True when this browser keeps a session of an admin.
  hasSession(): Promise<boolean>
  signIn(credentials: AdminCredentials): Promise<SignInOutcome>
  signOut(): Promise<void>
  // Calls `listener` whenever the session ends: signed out here or in another tab, or
  // expired. Returns the function that stops listening.
  onSessionEnd(listener: () => void): () => void
}
