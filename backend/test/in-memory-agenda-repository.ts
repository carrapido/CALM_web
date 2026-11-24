import type { AgendaRepository, Appointment, CalendarDate, WeeklySchedule } from '../src/types/agenda.js'

const CLOSED_WEEK: WeeklySchedule = {
  monday: { isOpen: false },
  tuesday: { isOpen: false },
  wednesday: { isOpen: false },
  thursday: { isOpen: false },
  friday: { isOpen: false },
  saturday: { isOpen: false },
  sunday: { isOpen: false },
}

// Stands in for weekly_schedule, blocked_dates and appointments, recording who changed them.
export class InMemoryAgendaRepository implements AgendaRepository {
  schedule: WeeklySchedule
  scheduleUpdatedBy: string | undefined
  readonly blockedBy = new Map<CalendarDate, string>()
  private appointments: Appointment[]

  constructor({
    schedule = CLOSED_WEEK,
    blocked = [],
    appointments = [],
  }: { schedule?: WeeklySchedule; blocked?: CalendarDate[]; appointments?: Appointment[] } = {}) {
    this.schedule = schedule
    for (const date of blocked) this.blockedBy.set(date, 'admin-user-id')
    this.appointments = appointments
  }

  async weeklySchedule(): Promise<WeeklySchedule> {
    return this.schedule
  }

  async saveWeeklySchedule(schedule: WeeklySchedule, adminId: string): Promise<void> {
    this.schedule = schedule
    this.scheduleUpdatedBy = adminId
  }

  async blockedDates(): Promise<CalendarDate[]> {
    return [...this.blockedBy.keys()].sort()
  }

  async blockDay(date: CalendarDate, adminId: string): Promise<void> {
    if (!this.blockedBy.has(date)) this.blockedBy.set(date, adminId)
  }

  async unblockDay(date: CalendarDate): Promise<void> {
    this.blockedBy.delete(date)
  }

  async appointmentsBetween(first: CalendarDate, last: CalendarDate): Promise<Appointment[]> {
    return this.appointments.filter(({ date }) => date >= first && date <= last)
  }

  async cancelAppointment(ticket: string, date: CalendarDate): Promise<boolean> {
    const isCancelled = (appointment: Appointment) => appointment.ticket === ticket && appointment.date === date
    const found = this.appointments.some(isCancelled)
    this.appointments = this.appointments.filter((appointment) => !isCancelled(appointment))
    return found
  }
}
