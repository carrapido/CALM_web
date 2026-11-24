import { Router } from 'express'
import { clientController } from '../controllers/client.controller.js'
import type { AuthAccounts, ClientRepository } from '../types/client.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export function clientRouter(clients: ClientRepository, authAccounts: AuthAccounts): Router {
  const controller = clientController(clients, authAccounts)
  const router = Router()

  router.get('/', asyncHandler(controller.list))
  router.post('/', asyncHandler(controller.create))
  router.put('/:id/access', asyncHandler(controller.grantAccess))

  return router
}
