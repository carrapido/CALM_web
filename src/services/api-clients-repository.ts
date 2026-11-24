import { ApiError, type ApiClient } from './api-client'
import type { ClientsRepository, EnrollmentField, EnrollmentOutcome } from './clients-repository'
import type { Client } from '../types/client'
import type { Enrollment } from '../utils/enrollment'

// The codes the API refuses an enrollment with, and the form field each one names
// (backend/src/controllers/client.controller.ts and the admin guard).
const REFUSAL_FIELDS: Record<string, EnrollmentField | undefined> = {
  name: 'name',
  phone: 'phone',
  nip: 'nip',
  phone_taken: 'phone',
  not_admin: undefined,
  not_found: undefined,
}

// The clients through the CALM API (backend/src/routes/client.routes.ts).
export class ApiClientsRepository implements ClientsRepository {
  private readonly api: ApiClient

  constructor(api: ApiClient) {
    this.api = api
  }

  clients(): Promise<Client[]> {
    return this.api.json('GET', '/clients')
  }

  async enroll(enrollment: Enrollment): Promise<EnrollmentOutcome> {
    try {
      await this.sendEnrollment(enrollment)
      return { kind: 'saved' }
    } catch (error) {
      return outcomeOfRefusal(error)
    }
  }

  private sendEnrollment(enrollment: Enrollment): Promise<Response> {
    const { phone, nip } = enrollment
    return enrollment.kind === 'new'
      ? this.api.send('POST', '/clients', { name: enrollment.name, phone, nip })
      : this.api.send('PUT', `/clients/${enrollment.clientId}/access`, { phone, nip })
  }
}

// A refusal the form can show; anything else never reached the API or is unexpected.
function outcomeOfRefusal(error: unknown): EnrollmentOutcome {
  if (!(error instanceof ApiError) || !Object.hasOwn(REFUSAL_FIELDS, error.code)) return { kind: 'unavailable' }
  return { kind: 'refused', message: error.message, field: REFUSAL_FIELDS[error.code] }
}
