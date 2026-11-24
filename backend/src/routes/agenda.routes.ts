import { Router } from 'express'
import { agendaController } from '../controllers/agenda.controller.js'
import type { AgendaRepository } from '../types/agenda.js'
import { asyncHandler } from '../utils/asyncHandler.js'

// Mounted at /api, because the schedule, the blocked days and the appointments live side by side.
export function agendaRouter(agenda: AgendaRepository): Router {
  const controller = agendaController(agenda)
  const router = Router()

  router.get('/schedule', asyncHandler(controller.schedule))
  router.put('/schedule', asyncHandler(controller.saveSchedule))
  router.get('/blocked-dates', asyncHandler(controller.blockedDates))
  router.post('/blocked-dates', asyncHandler(controller.blockDay))
  router.delete('/blocked-dates/:date', asyncHandler(controller.unblockDay))
  router.get('/appointments', asyncHandler(controller.appointments))
  router.delete('/appointments/:ticket', asyncHandler(controller.cancelAppointment))

  return router
}
