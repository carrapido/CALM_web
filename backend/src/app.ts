import express, { type Express } from 'express'
import { requireAdmin } from './middlewares/auth.middleware.js'
import { allowPanelOrigins } from './middlewares/cors.middleware.js'
import { handleErrors, routeNotFound } from './middlewares/error.middleware.js'
import { logRequests, type LogLine } from './middlewares/request-log.middleware.js'
import { agendaRouter } from './routes/agenda.routes.js'
import { clientRouter } from './routes/client.routes.js'
import { orderRouter } from './routes/order.routes.js'
import { serviceRouter } from './routes/service.routes.js'
import type { AgendaRepository } from './types/agenda.js'
import type { AdminRepository, Identity } from './types/auth.js'
import type { AuthAccounts, ClientRepository } from './types/client.js'
import type { OrderRepository } from './types/order.js'
import type { ServiceRepository } from './types/service.js'

// Everything the app talks to, so the tests can pass fakes instead of Supabase and Postgres.
export type AppDependencies = {
  // CORS_ORIGIN: the panel's origins, separated by commas.
  corsOrigin: string
  // Where each request's line goes; the terminal when not given.
  logRequest?: LogLine
  identity: Identity
  admins: AdminRepository
  services: ServiceRepository
  clients: ClientRepository
  authAccounts: AuthAccounts
  agenda: AgendaRepository
  orders: OrderRepository
}

export function createApp({
  corsOrigin,
  logRequest = console.log,
  identity,
  admins,
  services,
  clients,
  authAccounts,
  agenda,
  orders,
}: AppDependencies): Express {
  const app = express()
  // First, so even a CORS preflight or a refused request shows in the terminal.
  app.use(logRequests(logRequest))
  app.use(allowPanelOrigins(corsOrigin))
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api', requireAdmin(identity, admins))
  app.use('/api/services', serviceRouter(services))
  app.use('/api/clients', clientRouter(clients, authAccounts))
  app.use('/api/orders', orderRouter(orders))
  // Last: mounted at /api itself, for /schedule, /blocked-dates and /appointments.
  app.use('/api', agendaRouter(agenda))

  app.use(routeNotFound)
  app.use(handleErrors)
  return app
}
