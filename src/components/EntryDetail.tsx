import type { ReactNode } from 'react'
import type { Appointment } from '../types/appointment'
import { AppointmentDetail } from './AppointmentDetail'
import { OrderDetail, type MoveOrder } from './OrderDetail'
import type { CancunMoment } from '../utils/calendar-date'
import type { CalendarEntry } from '../utils/calendar-entries'

type EntryDetailProps = {
  // undefined until the admin chooses a chip.
  entry: CalendarEntry | undefined
  now: CancunMoment
  // Replaces the hint to choose a chip, e.g. with the pending appointments on Citas.
  nothingChosen?: ReactNode
  onCancelAppointment: (ticket: string) => void
  onMoveOrder: MoveOrder
  onClose: () => void
}

// The same detail the day and the orders list show, 360px beside the month. Below the
// split width it is a screen of its own, with their "Volver" button.
export function EntryDetail({
  entry,
  now,
  nothingChosen,
  onCancelAppointment,
  onMoveOrder,
  onClose,
}: EntryDetailProps) {
  return (
    <div className="min-w-0 @3xl:w-90 @3xl:shrink-0">
      {entry === undefined &&
        (nothingChosen ?? (
          <p className="rounded-xl bg-surface-container-lowest p-6 text-on-surface-variant @max-3xl:hidden">
            Elige una cita o un pedido del calendario para ver su detalle.
          </p>
        ))}
      {entry?.kind === 'appointment' && (
        <AppointmentDetail
          appointment={entry.appointment}
          canChange={!hasStarted(entry.appointment, now)}
          onCancel={onCancelAppointment}
          onClose={onClose}
        />
      )}
      {entry?.kind === 'order' && (
        <OrderDetail order={entry.order} today={now.date} onMove={onMoveOrder} onClose={onClose} />
      )}
    </div>
  )
}

// The day agenda's rule: once its time comes, there is nothing left to remind or cancel.
// Zero-padded `YYYY-MM-DD` and `HH:MM` strings sort chronologically.
function hasStarted({ date, time }: Appointment, now: CancunMoment): boolean {
  if (date !== now.date) return date < now.date
  return time <= now.time
}
