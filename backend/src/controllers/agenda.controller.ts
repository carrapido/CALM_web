// Validates what the panel sends for the schedule, the blocked days and the appointments, and
// answers over HTTP. Rules about blocking a day that has appointments stay in the panel.
import type { Request, Response } from 'express'
import {
  WEEKDAYS,
  type AgendaRepository,
  type CalendarDate,
  type DayHours,
  type WeeklySchedule,
} from '../types/agenda.js'
import { HttpError } from '../utils/http-error.js'
import { isRecord } from '../utils/is-record.js'
import { isCalendarDate, ticketOf } from '../utils/validation.js'

const WEEK_PROBLEM = 'El horario trae los siete días de la semana, de lunes a domingo.'
const HOURS_PROBLEM = 'Cada día indica isOpen; un día abierto abre y cierra a una hora en punto o y media (HH:MM).'
const ORDER_PROBLEM = 'La hora de cierre es posterior a la de apertura.'
const DATE_PROBLEM = 'La fecha no es válida; usa el formato AAAA-MM-DD.'
const RANGE_PROBLEM = 'Indica from y to en formato AAAA-MM-DD, con from igual o anterior a to.'
const INVALID_TICKET = invalidInput('El folio es de 4 dígitos.')

export function agendaController(agenda: AgendaRepository) {
  return {
    async schedule(_req: Request, res: Response): Promise<void> {
      res.json(await agenda.weeklySchedule())
    },

    async saveSchedule(req: Request, res: Response): Promise<void> {
      const schedule = weeklyScheduleOf(fieldOf(req.body, 'schedule'))
      await agenda.saveWeeklySchedule(schedule, adminIdOf(req))
      res.json(schedule)
    },

    async blockedDates(_req: Request, res: Response): Promise<void> {
      res.json(await agenda.blockedDates())
    },

    async blockDay(req: Request, res: Response): Promise<void> {
      const date = calendarDateOf(fieldOf(req.body, 'date'))
      await agenda.blockDay(date, adminIdOf(req))
      res.status(201).json({ date })
    },

    async unblockDay(req: Request, res: Response): Promise<void> {
      await agenda.unblockDay(calendarDateOf(req.params.date))
      res.status(204).send()
    },

    async appointments(req: Request, res: Response): Promise<void> {
      const { first, last } = dateRangeOf(req.query.from, req.query.to)
      res.json(await agenda.appointmentsBetween(first, last))
    },

    // Tickets repeat across dates, so the date tells which appointment to cancel.
    async cancelAppointment(req: Request, res: Response): Promise<void> {
      const ticket = ticketOf(req.params.ticket, INVALID_TICKET)
      const date = calendarDateOf(req.query.date)
      if (!(await agenda.cancelAppointment(ticket, date))) {
        throw new HttpError(404, 'not_found', 'No hay una cita con ese folio en esa fecha.')
      }
      res.status(204).send()
    },
  }
}

// express.json() leaves req.body undefined when the request has no JSON body.
function fieldOf(body: unknown, name: string): unknown {
  return isRecord(body) ? body[name] : undefined
}

// requireAdmin runs before every agenda route and always sets it.
function adminIdOf(req: Request): string {
  if (req.adminId === undefined) throw new Error('The agenda routes need requireAdmin before them')
  return req.adminId
}

function weeklyScheduleOf(value: unknown): WeeklySchedule {
  if (!isRecord(value) || !hasExactlyTheWeekdays(value)) throw invalidInput(WEEK_PROBLEM)
  return {
    monday: dayHoursOf(value.monday),
    tuesday: dayHoursOf(value.tuesday),
    wednesday: dayHoursOf(value.wednesday),
    thursday: dayHoursOf(value.thursday),
    friday: dayHoursOf(value.friday),
    saturday: dayHoursOf(value.saturday),
    sunday: dayHoursOf(value.sunday),
  }
}

function hasExactlyTheWeekdays(week: Record<string, unknown>): boolean {
  const days = Object.keys(week).filter((day) => week[day] !== undefined)
  return days.length === WEEKDAYS.length && WEEKDAYS.every((weekday) => days.includes(weekday))
}

// A closed day keeps no hours, as the panel stores it.
function dayHoursOf(value: unknown): DayHours {
  if (!isRecord(value) || typeof value.isOpen !== 'boolean') throw invalidInput(HOURS_PROBLEM)
  if (!value.isOpen) return { isOpen: false }
  const { opensAt, closesAt } = value
  if (!isSlotTime(opensAt) || !isSlotTime(closesAt)) throw invalidInput(HOURS_PROBLEM)
  if (closesAt <= opensAt) throw invalidInput(ORDER_PROBLEM)
  return { isOpen: true, opensAt, closesAt }
}

// `HH:MM` on the hour or the half hour; zero-padded, so text order is time order.
function isSlotTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):(00|30)$/.test(value)
}

function dateRangeOf(from: unknown, to: unknown): { first: CalendarDate; last: CalendarDate } {
  if (!isCalendarDate(from) || !isCalendarDate(to) || from > to) throw invalidInput(RANGE_PROBLEM)
  return { first: from, last: to }
}

function calendarDateOf(value: unknown): CalendarDate {
  if (!isCalendarDate(value)) throw invalidInput(DATE_PROBLEM)
  return value
}

function invalidInput(message: string): HttpError {
  return new HttpError(400, 'invalid_input', message)
}
