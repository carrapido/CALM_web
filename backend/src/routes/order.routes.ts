import { Router } from 'express'
import { orderController } from '../controllers/order.controller.js'
import type { OrderRepository } from '../types/order.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export function orderRouter(orders: OrderRepository): Router {
  const controller = orderController(orders)
  const router = Router()

  router.get('/', asyncHandler(controller.list))
  router.post('/', asyncHandler(controller.create))
  router.put('/:ticket', asyncHandler(controller.update))

  return router
}
