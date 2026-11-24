import type {
  BookingCalendar, CatalogService, ClientAccount, ClientAppRepository, ClientOrders, ClientSessions,
  NewAppointment, ProfileChanges, StoredCredentials,
} from '../src/types/client-app.js'

// A client as the table holds her, NIP hash and auth user included.
export type AppClient = ClientAccount & { nipHash: string | null; userId: string | null }

export type BookedAppointment = NewAppointment & { ticket: string }

export type ClientAppState = {
  clients?: AppClient[]
  services?: CatalogService[]
  calendar?: BookingCalendar
  ordersByClient?: Record<string, ClientOrders>
  // `date time` slots outside the hours, on a blocked day or already booked.
  closedSlots?: string[]
  // `date time` slots someone else takes between the check and the insert.
  slotsTakenAtInsert?: string[]
  // `clientId ticket` appointments she may still cancel.
  cancellable?: string[]
  // `clientId ticket` orders that are ready.
  readyOrders?: string[]
  // Auth users left unlinked by an earlier request, by email.
  orphansByEmail?: Record<string, string>
}

const MAX_NIP_CHECKS = 5

// Stands in for the tables the client app reaches, with claim_nip_attempt's five checks.
export class InMemoryClientAppRepository implements ClientAppRepository {
  readonly booked: BookedAppointment[] = []
  readonly cancelled: string[] = []
  readonly onTheWay: string[] = []
  private clients: AppClient[]
  private readonly checksByPhone = new Map<string, number>()
  private readonly state: ClientAppState

  constructor(state: ClientAppState = {}) {
    this.state = state
    this.clients = state.clients ?? []
  }

  stored(id: string): AppClient | undefined {
    return this.clients.find((client) => client.id === id)
  }

  nipChecksOn(phone: string): number {
    return this.checksByPhone.get(phone) ?? 0
  }

  lockOut(phone: string): void {
    this.checksByPhone.set(phone, MAX_NIP_CHECKS)
  }

  async signedInClient(userId: string): Promise<ClientAccount | null> {
    const client = this.clients.find((stored) => stored.userId === userId)
    return client === undefined ? null : accountOf(client)
  }

  async credentialsOf(phone: string): Promise<StoredCredentials | null> {
    const client = this.clients.find((stored) => stored.phone === phone)
    if (client === undefined) return null
    return { client: accountOf(client), nipHash: client.nipHash, userId: client.userId }
  }

  async claimNipAttempt(phone: string): Promise<boolean> {
    const checks = this.nipChecksOn(phone) + 1
    this.checksByPhone.set(phone, checks)
    return checks <= MAX_NIP_CHECKS
  }

  async clearSignInAttempts(phone: string): Promise<void> {
    this.checksByPhone.delete(phone)
  }

  async orphanedAuthUserId(email: string): Promise<string | null> {
    return this.state.orphansByEmail?.[email] ?? null
  }

  async linkAuthUser(clientId: string, userId: string): Promise<void> {
    this.clients = this.clients.map((client) => (client.id === clientId ? { ...client, userId } : client))
  }

  async activeServices(): Promise<CatalogService[]> {
    return this.state.services ?? []
  }

  async bookingCalendar(): Promise<BookingCalendar> {
    return this.state.calendar ?? { today: '', now: '', weekly: [], blocked: [], booked: [] }
  }

  async ordersOf(clientId: string): Promise<ClientOrders> {
    return this.state.ordersByClient?.[clientId] ?? { orders: [], appointments: [] }
  }

  async isSlotOpen(date: string, time: string): Promise<boolean> {
    return !(this.state.closedSlots ?? []).includes(`${date} ${time}`)
  }

  async book(appointment: NewAppointment): Promise<{ ticket: string } | 'slotTaken'> {
    if ((this.state.slotsTakenAtInsert ?? []).includes(`${appointment.date} ${appointment.time}`)) return 'slotTaken'
    const ticket = String(1000 + this.booked.length)
    this.booked.push({ ...appointment, ticket })
    return { ticket }
  }

  async cancelAppointment(clientId: string, ticket: string): Promise<boolean> {
    if (!(this.state.cancellable ?? []).includes(`${clientId} ${ticket}`)) return false
    this.cancelled.push(ticket)
    return true
  }

  async markOnMyWay(clientId: string, ticket: string): Promise<boolean> {
    if (!(this.state.readyOrders ?? []).includes(`${clientId} ${ticket}`)) return false
    this.onTheWay.push(ticket)
    return true
  }

  async updateProfile(clientId: string, { phone, nipHash }: ProfileChanges): Promise<ClientAccount | 'phoneTaken'> {
    if (this.clients.some((client) => client.phone === phone && client.id !== clientId)) return 'phoneTaken'
    this.clients = this.clients.map((client) =>
      client.id === clientId ? { ...client, phone, nipHash: nipHash ?? client.nipHash } : client,
    )
    const updated = this.stored(clientId)
    if (updated === undefined) throw new Error(`No client ${clientId}`)
    return accountOf(updated)
  }
}

// Records the auth users it creates and answers a refresh token named after the user.
export class RecordingClientSessions implements ClientSessions {
  readonly createdUsers: { email: string; clientId: string }[] = []
  mintsTokens = true

  async createAuthUser(email: string, clientId: string): Promise<string> {
    this.createdUsers.push({ email, clientId })
    return `new-user-of-${clientId}`
  }

  async refreshTokenFor(userId: string): Promise<string | null> {
    return this.mintsTokens ? `refresh-of-${userId}` : null
  }
}

function accountOf({ id, name, phone }: AppClient): ClientAccount {
  return { id, name, phone }
}
