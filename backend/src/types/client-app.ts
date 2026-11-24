// What the client app (calm_mobil) reads and sends under /api/client, in the JSON shapes of the
// contract in odd/tasks/app-movil-backend.md. The rules come from the retired Edge Functions
// client-sign-in, client-book and client-update-profile.
import type { Identity } from './auth.js'
import type { AuthAccounts, ClientRepository } from './client.js'
import type { OrderStatus } from './order.js'

// Her own data as the app shows it. A client who signs in always has a phone: the table
// refuses a NIP or an auth user without one (signs_in_with_phone, account_has_phone_and_nip).
export type ClientAccount = { id: string; name: string; phone: string }

// The client the bearer token names, with the auth user that token belongs to.
export type SignedInClient = ClientAccount & { userId: string }

// What the NIP check reads for a phone; the hash never leaves the server.
export type StoredCredentials = { client: ClientAccount; nipHash: string | null; userId: string | null }

// 'extra' is the urgent-garment charge, not a repair she can pick.
export type ServiceCategory = 'arreglo' | 'extra'

export type CatalogService = {
  id: string
  name: string
  category: ServiceCategory
  // Null when the price is quoted at the counter.
  basePriceMxn: number | null
}

// This month and the next, on Cancún's wall clock; booked slots never say who booked them.
export type BookingCalendar = {
  // `YYYY-MM-DD`
  today: string
  // `HH:MM`
  now: string
  // Both hours are null on a closed weekday.
  weekly: { weekday: string; opensAt: string | null; closesAt: string | null }[]
  blocked: string[]
  booked: { date: string; time: string }[]
}

export type ClientOrder = {
  ticket: string
  work: string
  status: OrderStatus
  finalPriceMxn: number
  deliveryDate: string
}

export type ClientAppointment = {
  ticket: string
  date: string
  time: string
  preliminaryTotalMxn: number
  services: string[]
  hasOrder: boolean
}

export type ClientOrders = { orders: ClientOrder[]; appointments: ClientAppointment[] }

export type NewAppointment = {
  clientId: string
  date: string
  time: string
  totalMxn: number
  // The repairs and, for an urgent garment, the urgent charge.
  serviceIds: string[]
}

// A null nipHash keeps her NIP as it is.
export type ProfileChanges = { phone: string; nipHash: string | null }

export interface ClientAppRepository {
  // The client linked to the auth user, or null when the user is not a client (an admin, say).
  signedInClient(userId: string): Promise<ClientAccount | null>
  // `clients.phone` is unique, so a phone names at most one client.
  credentialsOf(phone: string): Promise<StoredCredentials | null>
  // Counts a NIP check against the phone before it runs (claim_nip_attempt); false while locked out.
  claimNipAttempt(phone: string): Promise<boolean>
  clearSignInAttempts(phone: string): Promise<void>
  // An auth user created for this very client earlier and never linked (orphaned_auth_user_id).
  orphanedAuthUserId(email: string, clientId: string): Promise<string | null>
  linkAuthUser(clientId: string, userId: string): Promise<void>
  // By id.
  activeServices(): Promise<CatalogService[]>
  bookingCalendar(): Promise<BookingCalendar>
  ordersOf(clientId: string): Promise<ClientOrders>
  // Within the weekday's hours, not on a blocked day and not booked yet.
  isSlotOpen(date: string, time: string): Promise<boolean>
  // Picks a free ticket and stores the appointment with its services in one transaction.
  book(appointment: NewAppointment): Promise<{ ticket: string } | 'slotTaken'>
  // Her appointment with no order, more than 24 hours ahead in Cancún; false when none matched.
  cancelAppointment(clientId: string, ticket: string): Promise<boolean>
  // Her ready order becomes onTheWay; false when none matched.
  markOnMyWay(clientId: string, ticket: string): Promise<boolean>
  updateProfile(clientId: string, changes: ProfileChanges): Promise<ClientAccount | 'phoneTaken'>
}

// Supabase Auth's admin side in the running server; a fake in the tests.
export interface ClientSessions {
  // Her auth user, created confirmed; app_metadata.client_id says whose it is.
  createAuthUser(email: string, clientId: string): Promise<string>
  // A refresh token for the user without a password; null when Supabase would not mint one.
  refreshTokenFor(userId: string): Promise<string | null>
}

// What the /api/client routes talk to.
export type ClientAppDependencies = {
  identity: Identity
  clientApp: ClientAppRepository
  // A new phone that books becomes a client the same way the panel adds one.
  clients: ClientRepository
  authAccounts: AuthAccounts
  clientSessions: ClientSessions
  // Booking reads Cancún's wall clock from it.
  now: () => Date
}
