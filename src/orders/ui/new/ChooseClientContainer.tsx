import type { AgendaRepository } from '../../../agenda/application/agenda-repository'
import type { Appointment } from '../../../agenda/domain/appointment'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import { Button } from '../../../shared/ui/atoms/Button'
import { capitalize, formatLongDate } from '../../../shared/ui/format'
import { useQuery } from '../../../shared/ui/useQuery'
import { appointmentsAwaitingOrder } from '../../application/appointments-awaiting-order'
import type { OrdersRepository } from '../../application/orders-repository'

type ChooseClientContainerProps = {
  ordersRepository: OrdersRepository
  agendaRepository: AgendaRepository
  today: CalendarDate
  onChooseAppointment: (appointment: Appointment) => void
  onChooseWalkIn: () => void
  onBack: () => void
}

// Recognition over recall: the admin picks the client from a list instead of typing.
export function ChooseClientContainer({
  ordersRepository,
  agendaRepository,
  today,
  onChooseAppointment,
  onChooseWalkIn,
  onBack,
}: ChooseClientContainerProps) {
  const { data: appointments } = useQuery('appointments-awaiting-order', () =>
    appointmentsAwaitingOrder(agendaRepository, ordersRepository, today),
  )

  return (
    <div className="mt-space-lg flex flex-col gap-space-lg">
      <h2 className="text-headline-lg text-on-surface">Nuevo pedido</h2>
      <p className="text-title-md text-on-surface">¿De qué cita es el pedido?</p>
      <AppointmentChoices appointments={appointments} today={today} onChoose={onChooseAppointment} />
      <Button variant="primary" icon="person_add" onClick={onChooseWalkIn}>
        Cliente sin cita
      </Button>
      <Button icon="chevron_left" onClick={onBack} className="sm:self-start">
        Volver
      </Button>
    </div>
  )
}

type AppointmentChoicesProps = {
  appointments: Appointment[] | undefined
  today: CalendarDate
  onChoose: (appointment: Appointment) => void
}

function AppointmentChoices({ appointments, today, onChoose }: AppointmentChoicesProps) {
  if (appointments === undefined) return <p className="text-on-surface-variant">Cargando las citas…</p>
  if (appointments.length === 0) {
    return <p className="text-on-surface-variant">No hay citas recientes sin pedido.</p>
  }

  return (
    <ol aria-label="Citas sin pedido" className="flex flex-col gap-space-sm">
      {appointments.map((appointment) => (
        <li key={`${appointment.date}-${appointment.time}`}>
          <button
            type="button"
            onClick={() => onChoose(appointment)}
            className="flex min-h-16 w-full items-center rounded-xl border-2 border-primary bg-surface-container-lowest px-space-md text-left text-title-md text-on-surface transition-colors hover:bg-surface-container-high"
          >
            {appointmentLabel(appointment, today)}
          </button>
        </li>
      ))}
    </ol>
  )
}

function appointmentLabel({ date, time, clientName }: Appointment, today: CalendarDate): string {
  const day = date === today ? 'Hoy' : capitalize(formatLongDate(date))
  return `${day} · ${time} · ${clientName}`
}
