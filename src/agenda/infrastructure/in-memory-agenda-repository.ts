import type { AgendaRepository } from '../application/agenda-repository'
import type { Appointment } from '../domain/appointment'
import type { CalendarDate } from '../../shared/domain/calendar-date'
import type { WeeklySchedule } from '../domain/schedule'

type AgendaData = {
  schedule: WeeklySchedule
  appointments: Appointment[]
  blockedDates?: CalendarDate[]
}

export class InMemoryAgendaRepository implements AgendaRepository {
  private schedule: WeeklySchedule
  private appointments: Appointment[]
  private readonly blocked: Set<CalendarDate>

  constructor({ schedule, appointments, blockedDates = [] }: AgendaData) {
    this.schedule = schedule
    this.appointments = appointments
    this.blocked = new Set(blockedDates)
  }

  async weeklySchedule(): Promise<WeeklySchedule> {
    return this.schedule
  }

  async saveWeeklySchedule(schedule: WeeklySchedule): Promise<void> {
    this.schedule = schedule
  }

  async appointmentsBetween(first: CalendarDate, last: CalendarDate): Promise<Appointment[]> {
    return this.appointments.filter(({ date }) => date >= first && date <= last)
  }

  async cancelAppointment(ticket: string): Promise<void> {
    this.appointments = this.appointments.filter((appointment) => appointment.ticket !== ticket)
  }

  async blockedDates(): Promise<CalendarDate[]> {
    return [...this.blocked]
  }

  async blockDay(date: CalendarDate): Promise<void> {
    this.blocked.add(date)
  }

  async unblockDay(date: CalendarDate): Promise<void> {
    this.blocked.delete(date)
  }
}
