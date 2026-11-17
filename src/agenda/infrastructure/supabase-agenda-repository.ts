import type { SupabaseClient } from '@supabase/supabase-js'
import type { AgendaRepository } from '../application/agenda-repository'
import type { Appointment } from '../domain/appointment'
import type { WeeklySchedule } from '../domain/schedule'
import type { CalendarDate } from '../../shared/domain/calendar-date'
import type { Database } from '../../shared/infrastructure/database.types'
import { currentAdminIdOf } from '../../shared/infrastructure/current-admin-id'
import { appointmentFromRow } from './appointment-rows'
import { scheduleRowsOf, weeklyScheduleFrom } from './schedule-rows'

// https://supabase.com/docs/reference/javascript/select
export class SupabaseAgendaRepository implements AgendaRepository {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async weeklySchedule(): Promise<WeeklySchedule> {
    const { data, error } = await this.client.from('weekly_schedule').select('*')
    if (error) throw error
    return weeklyScheduleFrom(data)
  }

  // https://supabase.com/docs/reference/javascript/upsert
  async saveWeeklySchedule(schedule: WeeklySchedule): Promise<void> {
    const adminId = await currentAdminIdOf(this.client)
    const { error } = await this.client
      .from('weekly_schedule')
      .upsert(scheduleRowsOf(schedule, adminId), { onConflict: 'weekday' })
    if (error) throw error
  }

  async appointmentsBetween(first: CalendarDate, last: CalendarDate): Promise<Appointment[]> {
    const { data, error } = await this.client
      .from('appointments')
      .select(
        'ticket, scheduled_date, scheduled_time, preliminary_total_mxn, client:clients(name, phone), appointment_services(services(name))',
      )
      .gte('scheduled_date', first)
      .lte('scheduled_date', last)
      .order('scheduled_date')
      .order('scheduled_time')
    if (error) throw error
    return data.map((row) => appointmentFromRow(row))
  }

  // Cancelling an appointment removes it, as the in-memory adapter does.
  async cancelAppointment(ticket: string): Promise<void> {
    const { error } = await this.client.from('appointments').delete().eq('ticket', ticket)
    if (error) throw error
  }

  async blockedDates(): Promise<CalendarDate[]> {
    const { data, error } = await this.client
      .from('blocked_dates')
      .select('blocked_date')
      .order('blocked_date')
    if (error) throw error
    return data.map((row) => row.blocked_date)
  }

  async blockDay(date: CalendarDate): Promise<void> {
    const adminId = await currentAdminIdOf(this.client)
    const { error } = await this.client
      .from('blocked_dates')
      .upsert({ blocked_date: date, blocked_by: adminId }, { onConflict: 'blocked_date', ignoreDuplicates: true })
    if (error) throw error
  }

  async unblockDay(date: CalendarDate): Promise<void> {
    const { error } = await this.client.from('blocked_dates').delete().eq('blocked_date', date)
    if (error) throw error
  }
}
