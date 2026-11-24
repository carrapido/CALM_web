import type { ErrorRequestHandler, RequestHandler } from 'express'
import { DatabaseError } from 'pg'
import { HttpError } from '../utils/http-error.js'

const INVALID_INPUT = new HttpError(400, 'invalid_input', 'Los datos enviados no son válidos.')

// https://www.postgresql.org/docs/current/errcodes-appendix.html
const HTTP_ERROR_BY_POSTGRES_CODE: Record<string, HttpError> = {
  '23505': new HttpError(409, 'conflict', 'Ya existe un registro con esos datos.'),
  '23503': new HttpError(
    409,
    'conflict',
    'El registro está relacionado con otros datos y no se puede cambiar así.',
  ),
  '22P02': INVALID_INPUT,
  '22003': INVALID_INPUT,
  '22007': INVALID_INPUT,
  '22008': INVALID_INPUT,
  '23502': INVALID_INPUT,
  '23514': INVALID_INPUT,
}

const UNAVAILABLE = new HttpError(500, 'unavailable', 'No pudimos completar la operación. Inténtalo de nuevo.')

export const routeNotFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, 'not_found', `No existe la ruta ${req.method} ${req.path}.`))
}

// Every error ends here. Only HttpError messages reach the client; the rest is logged.
export const handleErrors: ErrorRequestHandler = (error, _req, res, _next) => {
  const httpError = httpErrorFor(error)
  if (httpError.status >= 500) console.error(error)
  res.status(httpError.status).json({ error: httpError.message, code: httpError.code })
}

function httpErrorFor(error: unknown): HttpError {
  if (error instanceof HttpError) return error
  if (error instanceof DatabaseError) return HTTP_ERROR_BY_POSTGRES_CODE[error.code ?? ''] ?? UNAVAILABLE
  if (isUnreadableBody(error)) return INVALID_INPUT
  if (isBodyTooLarge(error)) return BODY_TOO_LARGE
  if (isUnsupportedBody(error)) return UNSUPPORTED_BODY
  return UNAVAILABLE
}

const BODY_TOO_LARGE = new HttpError(413, 'body_too_large', 'Los datos enviados son demasiado grandes.')
const UNSUPPORTED_BODY = new HttpError(415, 'unsupported_body', 'Envía los datos como JSON en UTF-8.')

function bodyParserType(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'type' in error ? error.type : undefined
}

function isBodyTooLarge(error: unknown): boolean {
  return bodyParserType(error) === 'entity.too.large'
}

function isUnsupportedBody(error: unknown): boolean {
  const type = bodyParserType(error)
  return type === 'charset.unsupported' || type === 'encoding.unsupported'
}

// express.json() marks a body it cannot parse: https://github.com/expressjs/body-parser#errors
function isUnreadableBody(error: unknown): boolean {
  return error instanceof SyntaxError && 'type' in error && error.type === 'entity.parse.failed'
}
