import type { AgendaRepository } from '../services/agenda-repository'
import type { Appointment } from '../types/appointment'
import type { CalendarDate } from '../utils/calendar-date'
import { useQuery } from '../hooks/useQuery'
import { appointmentsAwaitingOrder } from '../services/appointments-awaiting-order'
import type { OrdersRepository } from '../services/orders-repository'
import { registerOrder, type OrderDetails } from '../services/register-order'
import { LoadError } from './LoadError'
import { NewOrderSheet } from './NewOrderSheet'

type NewOrderContainerProps = {
  ordersRepository: OrdersRepository
  agendaRepository: AgendaRepository
  random: () => number
  today: CalendarDate
  onRegistered: (ticket: string) => void
  onCancel: () => void
}

export function NewOrderContainer({
  ordersRepository,
  agendaRepository,
  random,
  today,
  onRegistered,
  onCancel,
}: NewOrderContainerProps) {
  const { data: appointments, error, reload } = useQuery('appointments-awaiting-order', () =>
    appointmentsAwaitingOrder(agendaRepository, ordersRepository, today),
  )

  // An order from an appointment keeps its ticket; a walk-in client gets a new one.
  const register = (details: OrderDetails, appointment: Appointment | undefined) =>
    registerOrder(
      { orders: ordersRepository, agenda: agendaRepository, random },
      details,
      appointment,
      today,
    ).then((order) => onRegistered(order.ticket))

  if (error !== undefined) return <LoadError error={error} onRetry={reload} className="mt-space-lg" />
  // The sheet starts on the first appointment, so it waits for the list.
  if (appointments === undefined) {
    return <p className="mt-space-lg text-on-surface-variant">Cargando las citas…</p>
  }
  return (
    <NewOrderSheet appointments={appointments} today={today} onRegister={register} onCancel={onCancel} />
  )
}
