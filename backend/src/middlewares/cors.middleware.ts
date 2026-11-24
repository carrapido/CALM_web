import cors from 'cors'
import type { RequestHandler } from 'express'

// `originList` is CORS_ORIGIN: the panel's origins separated by commas, e.g. both
// http://localhost:5173 and http://127.0.0.1:5173, since the browser tells them apart.
export function allowPanelOrigins(originList: string): RequestHandler {
  return cors({ origin: originsIn(originList) })
}

// A browser sends its origin without a trailing "/", so one typed with it would never match.
function originsIn(originList: string): string[] {
  return originList
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin !== '')
}
