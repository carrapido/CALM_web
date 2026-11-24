import type { RequestHandler } from 'express'

export type LogLine = (line: string) => void

// One line per answered request, e.g. "GET /api/services 200 12ms", so the terminal shows the
// flow. Only method, path, status and time: headers carry the token and bodies client data.
export function logRequests(log: LogLine): RequestHandler {
  return (req, res, next) => {
    const startedAt = performance.now()
    // Read now: the routers below rewrite req.url while they handle the request.
    const { method, path } = req
    res.on('finish', () => {
      log(`${method} ${path} ${res.statusCode} ${Math.round(performance.now() - startedAt)}ms`)
    })
    next()
  }
}
