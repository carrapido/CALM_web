import { FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js'
import type {
  ClientsRepository,
  EnrollmentField,
  EnrollmentOutcome,
} from '../application/clients-repository'
import type { Database } from '../../shared/infrastructure/database.types'
import type { Client } from '../domain/client'
import type { Enrollment } from '../domain/enrollment'

// `has_app_access` is a generated column: the panel learns whether a client can sign in to the
// app without the NIP hash, which no signed-in user may read, ever leaving the database.
type ClientRow = Pick<
  Database['public']['Tables']['clients']['Row'],
  'id' | 'name' | 'phone' | 'has_app_access'
>

const ENROLL_FUNCTION = 'admin-enroll-client'

// The codes admin-enroll-client refuses with, and the form field each one names.
const REFUSAL_FIELDS: Record<string, EnrollmentField | undefined> = {
  name: 'name',
  phone: 'phone',
  nip: 'nip',
  phone_taken: 'phone',
  not_admin: undefined,
  not_found: undefined,
}

export class SupabaseClientsRepository implements ClientsRepository {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  // https://supabase.com/docs/guides/database/tables#generated-columns
  async clients(): Promise<Client[]> {
    const { data, error } = await this.client
      .from('clients')
      .select('id, name, phone, has_app_access')
    if (error) throw error
    return data.map((row) => clientFromRow(row))
  }

  // https://supabase.com/docs/reference/javascript/functions-invoke
  async enroll(enrollment: Enrollment): Promise<EnrollmentOutcome> {
    const { error } = await this.client.functions.invoke(ENROLL_FUNCTION, {
      body: enrollmentBody(enrollment),
    })
    return error ? outcomeOfRefusal(error) : { kind: 'saved' }
  }
}

function clientFromRow(row: ClientRow): Client {
  // Generated as NOT NULL in practice; typed nullable like every generated column.
  return { id: String(row.id), name: row.name, phone: row.phone, hasAppAccess: row.has_app_access === true }
}

function enrollmentBody(enrollment: Enrollment) {
  const { phone, nip } = enrollment
  return enrollment.kind === 'new'
    ? { name: enrollment.name, phone, nip }
    : { client_id: Number(enrollment.clientId), phone, nip }
}

// A non-2xx answer arrives as a FunctionsHttpError whose context is the Response, with
// `{ error, code }` in its body. Anything else never reached the function or is unexpected.
async function outcomeOfRefusal(error: unknown): Promise<EnrollmentOutcome> {
  if (!(error instanceof FunctionsHttpError)) return { kind: 'unavailable' }
  const body: unknown = await (error.context as Response).json().catch(() => undefined)
  if (!isRefusalBody(body) || !Object.hasOwn(REFUSAL_FIELDS, body.code)) return { kind: 'unavailable' }
  return { kind: 'refused', message: body.error, field: REFUSAL_FIELDS[body.code] }
}

function isRefusalBody(body: unknown): body is { error: string; code: string } {
  return (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string' &&
    'code' in body &&
    typeof body.code === 'string'
  )
}
