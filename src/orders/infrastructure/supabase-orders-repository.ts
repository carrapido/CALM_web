import type { SupabaseClient } from '@supabase/supabase-js'
import type { OrdersRepository } from '../application/orders-repository'
import type { Order } from '../domain/order'
import type { Database } from '../../shared/infrastructure/database.types'
import { orderColumnsOf, orderFromRow } from './order-rows'

// https://supabase.com/docs/reference/javascript/select
export class SupabaseOrdersRepository implements OrdersRepository {
  private readonly client: SupabaseClient<Database>

  constructor(client: SupabaseClient<Database>) {
    this.client = client
  }

  async orders(): Promise<Order[]> {
    const { data, error } = await this.client
      .from('orders')
      .select(
        'ticket, work, final_price_mxn, delivery_date, status, client:clients(name, phone), appointment:appointments(scheduled_date, scheduled_time)',
      )
      .order('delivery_date')
    if (error) throw error
    return data.map((row) => orderFromRow(row))
  }

  // https://supabase.com/docs/reference/javascript/insert
  async addOrder(order: Order): Promise<void> {
    const { clientId, appointmentId } = await this.clientAndAppointmentOf(order)
    const { error } = await this.client.from('orders').insert({
      ...orderColumnsOf(order),
      ticket: order.ticket,
      client_id: clientId,
      appointment_id: appointmentId,
    })
    if (error) throw error
  }

  // https://supabase.com/docs/reference/javascript/update
  async updateActiveOrder(order: Order): Promise<void> {
    const { error } = await this.client
      .from('orders')
      .update(orderColumnsOf(order))
      .eq('ticket', order.ticket)
      .not('status', 'in', '(delivered,cancelled)')
    if (error) throw error
  }

  // An order from an appointment belongs to its client; a walk-in client is looked up or created.
  private async clientAndAppointmentOf(
    order: Order,
  ): Promise<{ clientId: number; appointmentId: number | null }> {
    if (order.appointment === undefined) {
      return { clientId: await this.walkInClientIdOf(order), appointmentId: null }
    }
    const { data, error } = await this.client
      .from('appointments')
      .select('id, client_id')
      .eq('scheduled_date', order.appointment.date)
      .eq('scheduled_time', order.appointment.time)
      .single()
    if (error) throw error
    return { clientId: data.client_id, appointmentId: data.id }
  }

  // The phone is unique in `clients`, so a walk-in client with a known number is the client
  // already stored under it.
  private async walkInClientIdOf(order: Order): Promise<number> {
    if (order.whatsapp !== undefined) {
      const { data, error } = await this.client
        .from('clients')
        .select('id')
        .eq('phone', order.whatsapp)
        .maybeSingle()
      if (error) throw error
      if (data !== null) return data.id
    }
    const { data, error } = await this.client
      .from('clients')
      .insert({ name: order.clientName, phone: order.whatsapp ?? null })
      .select('id')
      .single()
    if (error) throw error
    return data.id
  }
}
