import type { ClientsRepository, EnrollmentOutcome } from '../services/clients-repository'
import type { Client } from '../types/client'
import type { Enrollment } from '../utils/enrollment'

// Stands in for Supabase in tests. Like the server, it refuses a phone another client uses.
export class InMemoryClientsRepository implements ClientsRepository {
  // What it was asked to save, so tests can check what reached the store.
  readonly enrollments: Enrollment[] = []
  private clientList: Client[]
  // A counter, not crypto.randomUUID(): that needs a secure context, which a phone
  // opening the dev server by LAN IP over http does not have.
  private nextId = 1

  constructor(clients: Client[]) {
    this.clientList = clients
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
}
