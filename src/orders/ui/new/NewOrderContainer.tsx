import type { AgendaRepository } from '../../../agenda/application/agenda-repository'
import type { Appointment } from '../../../agenda/domain/appointment'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import type { OrdersRepository } from '../../application/orders-repository'
import { registerOrder, type OrderDetails } from '../../application/register-order'
import type { NewOrderDraft } from '../../domain/new-order'
import { NewOrderForm } from './NewOrderForm'

type NewOrderContainerProps = {
  ordersRepository: OrdersRepository
  agendaRepository: AgendaRepository
  random: () => number
  today: CalendarDate
  // The appointment the client came to; undefined for a walk-in client.
  appointment: Appointment | undefined
  onRegistered: (ticket: string) => void
  onCancel: () => void
}

export function NewOrderContainer({
  ordersRepository,
  agendaRepository,
  random,
  today,
  appointment,
  onRegistered,
  onCancel,
}: NewOrderContainerProps) {
  const register = (details: OrderDetails) =>
    registerOrder(
      { orders: ordersRepository, agenda: agendaRepository, random },
      details,
      appointment,
      today,
    ).then((order) => onRegistered(order.ticket))

  return (
    <NewOrderForm
      initialDraft={draftFrom(appointment)}
      today={today}
      onSave={register}
      onCancel={onCancel}
    />
  )
}

// From an appointment, the quote prefills the work and its preliminary total the price.
function draftFrom(appointment: Appointment | undefined): NewOrderDraft {
  if (appointment === undefined) {
    return { clientName: '', whatsapp: '', work: '', finalPrice: '', deliveryDate: '' }
  }
  return {
    clientName: appointment.clientName,
    whatsapp: appointment.whatsapp ?? '',
    work: appointment.quote.services.join(', '),
    finalPrice: String(appointment.quote.preliminaryTotalMxn),
    deliveryDate: '',
  }
}
