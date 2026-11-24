// Supabase Auth in the running server; a fake in the tests.
export interface Identity {
  // The user the token belongs to, or null when the token is invalid or expired.
  userIdForToken(token: string): Promise<string | null>
}

export interface AdminRepository {
  isAdmin(userId: string): Promise<boolean>
}
