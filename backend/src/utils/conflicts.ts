import { HttpError } from './http-error.js'

// The 409s the panel can explain to the admin. The controllers throw them for the refusals a
// repository reports; the error middleware picks them by the Postgres constraint a statement broke.
// The panel highlights the phone field for this code (src/services/api-clients-repository.ts).
export const PHONE_TAKEN = new HttpError(409, 'phone_taken', 'Ese celular ya es de otro cliente.')
export const TICKET_TAKEN = new HttpError(409, 'ticket_taken', 'Ya hay un pedido activo con ese folio.')
export const APPOINTMENT_HAS_ORDER = new HttpError(409, 'appointment_has_order', 'Esta cita ya tiene un pedido.')

const SERVICE_NAME_TAKEN = new HttpError(409, 'service_name_taken', 'Ya existe un servicio con ese nombre.')
const CANCEL_APPOINTMENT_WITH_ORDER = new HttpError(
  409,
  'appointment_has_order',
  'Esta cita ya tiene un pedido; cancela o entrega el pedido primero.',
)

// The constraint names of database/schema.sql that a statement of the API can break.
const CONFLICT_BY_CONSTRAINT: Record<string, HttpError> = {
  services_name_key: SERVICE_NAME_TAKEN,
  clients_phone_key: PHONE_TAKEN,
  orders_active_ticket_key: TICKET_TAKEN,
  orders_appointment_id_key: APPOINTMENT_HAS_ORDER,
  // Deleting an appointment that an order points to.
  orders_appointment_id_fkey: CANCEL_APPOINTMENT_WITH_ORDER,
}

export function conflictOfConstraint(constraint: string | undefined): HttpError | undefined {
  return constraint === undefined ? undefined : CONFLICT_BY_CONSTRAINT[constraint]
}
