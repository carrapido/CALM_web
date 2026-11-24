// Validates what the panel sends, applies the catalog rules and answers over HTTP.
import type { Request, Response } from 'express'
import type { ServiceDetails, ServicePrice, ServiceRepository } from '../types/service.js'
import { HttpError } from '../utils/http-error.js'

const MAX_NAME_LENGTH = 80
const MAX_ESTIMATED_DAYS = 30

const SERVICE_NOT_FOUND = new HttpError(404, 'not_found', 'El servicio no existe.')

export function serviceController(services: ServiceRepository) {
  return {
    async list(_req: Request, res: Response): Promise<void> {
      res.json(await services.all())
    },

    async create(req: Request, res: Response): Promise<void> {
      res.status(201).json(await services.add(serviceDetailsOf(req.body)))
    },

    async update(req: Request, res: Response): Promise<void> {
      const id = serviceIdOf(req)
      const service = { id, ...serviceDetailsOf(req.body), isActive: isActiveOf(req.body) }
      const updated = await services.update(service)
      if (updated === null) throw SERVICE_NOT_FOUND
      res.json(updated)
    },

    async remove(req: Request, res: Response): Promise<void> {
      const outcome = await services.remove(serviceIdOf(req))
      if (outcome === 'notFound') throw SERVICE_NOT_FOUND
      if (outcome === 'inUse') {
        throw new HttpError(
          409,
          'service_in_use',
          'No se puede eliminar porque hay citas que usan este servicio. Desactívalo para ocultarlo a los clientes.',
        )
      }
      res.status(204).send()
    },
  }
}

function serviceIdOf(req: Request): string {
  const id = req.params.id
  if (typeof id !== 'string' || !/^[1-9]\d*$/.test(id)) {
    throw invalidInput('El identificador del servicio no es válido.')
  }
  return id
}

// express.json() leaves req.body undefined when the request has no JSON body.
function serviceDetailsOf(body: unknown): ServiceDetails {
  const fields = isRecord(body) ? body : {}
  return {
    name: nameOf(fields.name),
    price: priceOf(fields.price),
    estimatedDays: estimatedDaysOf(fields.estimatedDays),
  }
}

function nameOf(value: unknown): string {
  const name = typeof value === 'string' ? value.trim() : ''
  if (name === '' || name.length > MAX_NAME_LENGTH) {
    throw invalidInput('El nombre es obligatorio y tiene hasta 80 caracteres.')
  }
  return name
}

function priceOf(value: unknown): ServicePrice {
  if (isRecord(value) && value.kind === 'inStore') return { kind: 'inStore' }
  if (isRecord(value) && value.kind === 'base' && isIntegerBetween(value.amountMxn, 0, Infinity)) {
    return { kind: 'base', amountMxn: value.amountMxn }
  }
  throw invalidInput('El precio es un entero de 0 o más, o se cotiza en tienda.')
}

function estimatedDaysOf(value: unknown): number {
  if (!isIntegerBetween(value, 0, MAX_ESTIMATED_DAYS)) {
    throw invalidInput('Los días estimados son un entero de 0 a 30.')
  }
  return value
}

function isActiveOf(body: unknown): boolean {
  const isActive = isRecord(body) ? body.isActive : undefined
  if (typeof isActive !== 'boolean') {
    throw invalidInput('Indica si el servicio está activo con true o false.')
  }
  return isActive
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isIntegerBetween(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}

function invalidInput(message: string): HttpError {
  return new HttpError(400, 'invalid_input', message)
}
