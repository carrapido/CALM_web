import cors from 'cors'
import express, { type Express } from 'express'
import { requireAdmin } from './middlewares/auth.middleware.js'
import { handleErrors, routeNotFound } from './middlewares/error.middleware.js'
import { serviceRouter } from './routes/service.routes.js'
import type { AdminRepository, Identity } from './types/auth.js'
import type { ServiceRepository } from './types/service.js'

// Everything the app talks to, so the tests can pass fakes instead of Supabase and Postgres.
export type AppDependencies = {
  corsOrigin: string
  identity: Identity
  admins: AdminRepository
  services: ServiceRepository
}

export function createApp({ corsOrigin, identity, admins, services }: AppDependencies): Express {
  const app = express()
  app.use(cors({ origin: corsOrigin }))
  app.use(express.json())

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api', requireAdmin(identity, admins))
  app.use('/api/services', serviceRouter(services))

  app.use(routeNotFound)
  app.use(handleErrors)
  return app
}
