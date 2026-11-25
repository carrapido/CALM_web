import type {
  AppAccess, Client, ClientHistory, ClientRepository, DeleteAuthUser, GrantedAccess, NewClient, RemovedClient,
} from '../src/types/client.js'

// A client as the table holds her: the NIP hash and the auth user stay out of Client.
export type StoredClient = Client & { nipHash: string | null; userId: string | null }

const NO_HISTORY: ClientHistory = { appointments: 0, orders: 0 }

// Stands in for the clients table, including its unique phone, and for the count of her
// appointments and orders, which go with her when she is removed.
export class InMemoryClientRepository implements ClientRepository {
  private stored: StoredClient[]
  private histories: Record<string, ClientHistory>
  private nextId = 100

  constructor(clients: StoredClient[] = [], histories: Record<string, ClientHistory> = {}) {
    this.stored = clients
    this.histories = histories
  }

  async all(): Promise<Client[]> {
    return this.stored.map(publicClient)
  }

  // What the table holds for the client, NIP hash included.
  storedClient(id: string): StoredClient | undefined {
    return this.stored.find((client) => client.id === id)
  }

  async add({ name, phone, nipHash }: NewClient): Promise<Client | 'phoneTaken'> {
    if (this.isPhoneTaken(phone, undefined)) return 'phoneTaken'
    const client = { id: String(this.nextId++), name, phone, hasAppAccess: true, nipHash, userId: null }
    this.stored = [...this.stored, client]
    return publicClient(client)
  }

  async grantAccess({ clientId, phone, nipHash }: AppAccess): Promise<GrantedAccess | 'notFound' | 'phoneTaken'> {
    const before = this.storedClient(clientId)
    if (before === undefined) return 'notFound'
    if (this.isPhoneTaken(phone, clientId)) return 'phoneTaken'
    const after = { ...before, phone, nipHash, hasAppAccess: true }
    this.stored = this.stored.map((client) => (client.id === clientId ? after : client))
    const isRenamed = before.userId !== null && before.phone !== phone
    return { client: publicClient(after), authUserToRename: isRenamed ? before.userId : null }
  }

  async history(clientId: string): Promise<ClientHistory | 'notFound'> {
    if (this.storedClient(clientId) === undefined) return 'notFound'
    return this.histories[clientId] ?? NO_HISTORY
  }

  async remove(clientId: string, deleteAuthUser: DeleteAuthUser): Promise<RemovedClient | 'notFound'> {
    const client = this.storedClient(clientId)
    if (client === undefined) return 'notFound'
    // Like the transaction: a failing auth deletion leaves her stored.
    if (client.userId !== null) await deleteAuthUser(client.userId)
    this.stored = this.stored.filter((stored) => stored.id !== clientId)
    this.histories = Object.fromEntries(Object.entries(this.histories).filter(([id]) => id !== clientId))
    return { authUserId: client.userId }
  }

  private isPhoneTaken(phone: string, ownId: string | undefined): boolean {
    return this.stored.some((client) => client.phone === phone && client.id !== ownId)
  }
}

function publicClient({ id, name, phone, hasAppAccess }: StoredClient): Client {
  return { id, name, phone, hasAppAccess }
}
