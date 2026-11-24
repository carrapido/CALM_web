import type {
  AppAccess, Client, ClientRepository, GrantedAccess, NewClient,
} from '../src/types/client.js'

// A client as the table holds her: the NIP hash and the auth user stay out of Client.
export type StoredClient = Client & { nipHash: string | null; userId: string | null }

// Stands in for the clients table, including its unique phone.
export class InMemoryClientRepository implements ClientRepository {
  private stored: StoredClient[]
  private nextId = 100

  constructor(clients: StoredClient[] = []) {
    this.stored = clients
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

  private isPhoneTaken(phone: string, ownId: string | undefined): boolean {
    return this.stored.some((client) => client.phone === phone && client.id !== ownId)
  }
}

function publicClient({ id, name, phone, hasAppAccess }: StoredClient): Client {
  return { id, name, phone, hasAppAccess }
}
