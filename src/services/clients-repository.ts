import type { Client } from '../types/client'
import type { Enrollment } from '../utils/enrollment'

// The fields the server can name when it refuses an enrollment.
export type EnrollmentField = 'name' | 'phone' | 'nip'

export type EnrollmentOutcome =
  | { kind: 'saved' }
  // The server's own message, shown as is; `field` is set when it names one.
  | { kind: 'refused'; message: string; field: EnrollmentField | undefined }
  // It never answered, or answered something unexpected.
  | { kind: 'unavailable' }

// Port: Supabase in the running app, in memory in tests.
export interface ClientsRepository {
  clients(): Promise<Client[]>
  // Registers a new client or gives an existing one access with a new NIP.
  enroll(enrollment: Enrollment): Promise<EnrollmentOutcome>
}
