import type { ClientHistory, ClientsRepository, EnrollmentOutcome } from '../services/clients-repository'
import type { Client } from '../types/client'
import type { Enrollment } from '../utils/enrollment'

const NO_HISTORY: ClientHistory = { appointments: 0, orders: 0 }

// Stands in for Supabase in tests. Like the server, it refuses a phone another client uses.
export class InMemoryClientsRepository implements ClientsRepository {
  // What it was asked to save, so tests can check what reached the store.
  readonly enrollments: Enrollment[] = []
  // The ids it was asked to delete, in order.
  readonly removedIds: string[] = []
  private clientList: Client[]
  private readonly histories: Record<string, ClientHistory>
  // A counter, not crypto.randomUUID(): that needs a secure context, which a phone
  // opening the dev server by LAN IP over http does not have.
  private nextId = 1

  constructor(clients: Client[], histories: Record<string, ClientHistory> = {}) {
    this.clientList = clients
    this.histories = histories
  }

  async clients(): Promise<Client[]> {
    return this.clientList
  }

  async enroll(enrollment: Enrollment): Promise<EnrollmentOutcome> {
    const clientId = enrollment.kind === 'existing' ? enrollment.clientId : undefined
    if (this.clientList.some((client) => client.id !== clientId && client.phone === enrollment.phone)) {
      return { kind: 'refused', message: 'Ese celular ya es de otro cliente.', field: 'phone' }
    }
    this.enrollments.push(enrollment)
    if (enrollment.kind === 'new') {
      const client = { id: `new-client-${this.nextId++}`, name: enrollment.name, phone: enrollment.phone, hasAppAccess: true }
      this.clientList = [...this.clientList, client]
    } else {
      this.clientList = this.clientList.map((client) =>
        client.id === clientId ? { ...client, phone: enrollment.phone, hasAppAccess: true } : client,
      )
    }
    return { kind: 'saved' }
  }

  async history(id: string): Promise<ClientHistory> {
    return this.histories[id] ?? NO_HISTORY
  }

  async remove(id: string): Promise<void> {
    this.removedIds.push(id)
    this.clientList = this.clientList.filter((client) => client.id !== id)
  }
}
