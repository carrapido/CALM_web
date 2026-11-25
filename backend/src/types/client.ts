// The same JSON shape as the panel's Client type (src/types/client.ts in the frontend).
export type Client = {
  id: string
  name: string
  // 10 digits; some clients were registered without one.
  phone: string | null
  // She can sign in to the client app with her phone and NIP.
  hasAppAccess: boolean
}

// The NIP arrives already hashed: the typed one never reaches the database.
export type NewClient = { name: string; phone: string; nipHash: string }

export type AppAccess = { clientId: string; phone: string; nipHash: string }

export type GrantedAccess = {
  client: Client
  // Her auth user, when she already signed in to the app and her phone changed; null otherwise.
  authUserToRename: string | null
}

// What deleting her takes with her, so the panel can say it before she is gone.
export type ClientHistory = { appointments: number; orders: number }

export type RemovedClient = {
  // Her auth user, when she signed in to the app; null otherwise.
  authUserId: string | null
}

// Runs before her rows are deleted: throwing stops the deletion with nothing deleted.
export type DeleteAuthUser = (userId: string) => Promise<void>

export interface ClientRepository {
  all(): Promise<Client[]>
  add(client: NewClient): Promise<Client | 'phoneTaken'>
  // Gives an existing client a NIP, and her phone may change with it.
  grantAccess(access: AppAccess): Promise<GrantedAccess | 'notFound' | 'phoneTaken'>
  history(clientId: string): Promise<ClientHistory | 'notFound'>
  // Permanent: her orders, appointments and sign-in attempts go with her, all or nothing.
  // Her auth user is deleted first, then her rows in one transaction.
  remove(clientId: string, deleteAuthUser: DeleteAuthUser): Promise<RemovedClient | 'notFound'>
}

// Supabase Auth in the running server; a fake in the tests.
export interface AuthAccounts {
  updateEmail(userId: string, email: string): Promise<void>
  deleteUser(userId: string): Promise<void>
}
