import { Router } from 'express'
import { bookingController } from '../controllers/booking.controller.js'
import { clientAppController } from '../controllers/client-app.controller.js'
import { requireClient } from '../middlewares/client-auth.middleware.js'
import { routeNotFound } from '../middlewares/error.middleware.js'
import type { ClientAppDependencies } from '../types/client-app.js'
import { asyncHandler } from '../utils/asyncHandler.js'

// Mounted at /api/client, before the admin guard: the client app's own routes and guard.
export function clientAppRouter(dependencies: ClientAppDependencies): Router {
  const controller = clientAppController(dependencies)
  const booking = bookingController(dependencies)
  const signedIn = requireClient(dependencies.identity, dependencies.clientApp)
  const router = Router()

  router.post('/sign-in', asyncHandler(controller.signIn))
  router.get('/services', asyncHandler(controller.services))
  router.get('/booking-calendar', asyncHandler(controller.bookingCalendar))
  // A signed-in client or a contact with her phone and NIP; the controller tells them apart.
  router.post('/appointments', asyncHandler(booking.book))
  router.get('/profile', signedIn, asyncHandler(controller.profile))
  router.put('/profile', signedIn, asyncHandler(controller.updateProfile))
  router.get('/orders', signedIn, asyncHandler(controller.orders))
  router.delete('/appointments/:ticket', signedIn, asyncHandler(controller.cancelAppointment))
  router.post('/orders/:ticket/on-my-way', signedIn, asyncHandler(controller.markOnMyWay))
  // An unknown client route ends here rather than at the admin guard.
  router.use(routeNotFound)

  return router
}
