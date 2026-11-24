import type { AgendaRepository } from './agenda-repository'
import type { ApiClient } from './api-client'
import type { Appointment } from '../types/appointment'
import type { CalendarDate } from '../utils/calendar-date'
import type { WeeklySchedule } from '../utils/schedule'

// The agenda through the CALM API (backend/src/routes/agenda.routes.ts).
export class ApiAgendaRepository implements AgendaRepository {
  private readonly api: ApiClient

  constructor(api: ApiClient) {
    this.api = api
  }

  weeklySchedule(): Promise<WeeklySchedule> {
    return this.api.json('GET', '/schedule')
  }

  async saveWeeklySchedule(schedule: WeeklySchedule): Promise<void> {
    await this.api.send('PUT', '/schedule', { schedule })
  }

  appointmentsBetween(first: CalendarDate, last: CalendarDate): Promise<Appointment[]> {
    return this.api.json('GET', `/appointments?${new URLSearchParams({ from: first, to: last })}`)
  }

  async cancelAppointment(ticket: string, date: CalendarDate): Promise<void> {
    await this.api.send('DELETE', `/appointments/${encodeURIComponent(ticket)}?${new URLSearchParams({ date })}`)
  }

  blockedDates(): Promise<CalendarDate[]> {
    return this.api.json('GET', '/blocked-dates')
  }

  async blockDay(date: CalendarDate): Promise<void> {
    await this.api.send('POST', '/blocked-dates', { date })
  }

  async unblockDay(date: CalendarDate): Promise<void> {
    await this.api.send('DELETE', `/blocked-dates/${encodeURIComponent(date)}`)
  }
}
