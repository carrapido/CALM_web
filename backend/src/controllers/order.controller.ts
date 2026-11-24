// Validates what the panel sends, applies the order rules and answers over HTTP.
// A 400 carries the name of the wrong field as its code, so the panel can point at it.
import type { Request, Response } from 'express'
import {
  isOrderStatus, type AddRefusal, type AppointmentSlot, type NewOrder, type OrderChanges,
  type OrderRepository, type OrderStatus,
} from '../types/order.js'
import { HttpError } from '../utils/http-error.js'
import { isRecord } from '../utils/is-record.js'

const REFUSAL_ERRORS: Record<AddRefusal, HttpError> = {
  appointmentNotFound: new HttpError(404, 'not_found', 'No hay una cita en esa fecha y hora.'),
  ticketTaken: new HttpError(409, 'ticket_taken', 'Ya hay un pedido activo con ese folio.'),
  appointmentHasOrder: new HttpError(409, 'appointment_has_order', 'Esta cita ya tiene un pedido.'),
}

export function orderController(orders: OrderRepository) {
  return {
    async list(_req: Request, res: Response): Promise<void> {
      res.json(await orders.all())
    },

    async create(req: Request, res: Response): Promise<void> {
      const outcome = await orders.add(newOrderOf(fieldsOf(req.body)))
      if (typeof outcome === 'string') throw REFUSAL_ERRORS[outcome]
      res.status(201).json(outcome)
    },

    async update(req: Request, res: Response): Promise<void> {
      const ticket = ticketOf(req.params.ticket)
      const updated = await orders.updateActive(ticket, orderChangesOf(fieldsOf(req.body)))
      if (updated === null) {
        throw new HttpError(404, 'not_found', 'No hay un pedido activo con ese folio.')
      }
      res.json(updated)
    },
  }
}

// express.json() leaves req.body undefined when the request has no JSON body.
function fieldsOf(body: unknown): Record<string, unknown> {
  return isRecord(body) ? body : {}
}

function newOrderOf(fields: Record<string, unknown>): NewOrder {
  const ticket = ticketOf(fields.ticket)
  const changes = orderChangesOf(fields)
  if (fields.appointment !== undefined) {
    return { ticket, ...changes, appointment: appointmentOf(fields.appointment) }
  }
  return { ticket, ...changes, clientName: clientNameOf(fields.clientName), whatsapp: whatsappOf(fields.whatsapp) }
}

function orderChangesOf(fields: Record<string, unknown>): OrderChanges {
  return {
    work: workOf(fields.work),
    finalPriceMxn: finalPriceOf(fields.finalPriceMxn),
    deliveryDate: deliveryDateOf(fields.deliveryDate),
    status: statusOf(fields.status),
  }
}

function ticketOf(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}$/.test(value)) {
    throw invalidField('ticket', 'El folio son 4 dígitos.')
  }
  return value
}

function workOf(value: unknown): string {
  const work = typeof value === 'string' ? value.trim() : ''
  if (work === '') throw invalidField('work', 'Describe el trabajo del pedido.')
  return work
}

function finalPriceOf(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw invalidField('finalPriceMxn', 'El precio final es un entero de 0 o más.')
  }
  return value
}

function deliveryDateOf(value: unknown): string {
  if (!isCalendarDate(value)) {
    throw invalidField('deliveryDate', 'La fecha de entrega es una fecha AAAA-MM-DD.')
  }
  return value
}

function statusOf(value: unknown): OrderStatus {
  if (!isOrderStatus(value)) throw invalidField('status', 'El estado del pedido no es válido.')
  return value
}

function appointmentOf(value: unknown): AppointmentSlot {
  if (!isRecord(value) || !isCalendarDate(value.date) || typeof value.time !== 'string' || !isClockTime(value.time)) {
    throw invalidField('appointment', 'La cita es una fecha AAAA-MM-DD y una hora HH:MM.')
  }
  return { date: value.date, time: value.time }
}

function clientNameOf(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : ''
  if (name === '') throw invalidField('clientName', 'El nombre de la clienta es obligatorio.')
  return name
}

// JSON leaves out an absent phone; null means the same.
function whatsappOf(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'string' || !/^\d{10}$/.test(value)) {
    throw invalidField('whatsapp', 'El WhatsApp son 10 dígitos.')
  }
  return value
}

// A real day, so 2026-02-30 fails here rather than in Postgres.
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value)
}

function isClockTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function invalidField(field: string, message: string): HttpError {
  return new HttpError(400, field, message)
}
