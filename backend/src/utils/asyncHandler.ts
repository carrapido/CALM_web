import type { RequestHandler } from 'express'

type AsyncRequestHandler = (...args: Parameters<RequestHandler>) => Promise<void>

// Sends a rejected promise to the error middleware, so every handler fails the same way.
export function asyncHandler(handler: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next)
  }
}
