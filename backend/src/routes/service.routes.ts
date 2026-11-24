import { Router } from 'express'
import { serviceController } from '../controllers/service.controller.js'
import type { ServiceRepository } from '../types/service.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export function serviceRouter(services: ServiceRepository): Router {
  const controller = serviceController(services)
  const router = Router()

  router.get('/', asyncHandler(controller.list))
  router.post('/', asyncHandler(controller.create))
  router.put('/:id', asyncHandler(controller.update))
  router.delete('/:id', asyncHandler(controller.remove))

  return router
}
