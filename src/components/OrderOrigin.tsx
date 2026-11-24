import { useId } from 'react'
import type { Appointment } from '../types/appointment'
import type { CalendarDate } from '../utils/calendar-date'
import { capitalize, formatLongDate } from '../utils/format'

type OrderOriginProps = {
  appointments: Appointment[]
  today: CalendarDate
  // undefined for a client who came without an appointment.
  chosen: Appointment | undefined
  onChoose: (appointment: Appointment | undefined) => void
}

// Recognition over recall: the admin picks the client from a list instead of typing.
// Native radios bring arrow-key movement and the checked state for free
// (https://www.w3.org/WAI/ARIA/apg/patterns/radio/).
export function OrderOrigin({ appointments, today, chosen, onChoose }: OrderOriginProps) {
  const groupName = useId()

  return (
    <fieldset className="flex flex-col">
      <legend className="px-4 pb-2 text-title-md text-on-surface">¿De qué cita viene?</legend>
      <div className="flex flex-col overflow-hidden rounded-xl bg-surface-container-lowest">
        {appointments.map((appointment) => (
          <OriginOption
            key={`${appointment.date}-${appointment.time}`}
            groupName={groupName}
            name={appointment.clientName}
            detail={appointmentDetail(appointment, today)}
            isChosen={appointment === chosen}
            onChoose={() => onChoose(appointment)}
          />
        ))}
        <OriginOption
          groupName={groupName}
          name="Llegó sin cita"
          isChosen={chosen === undefined}
          onChoose={() => onChoose(undefined)}
        />
      </div>
    </fieldset>
  )
}

// "Hoy a las 10:30 · Ticket 4821"
function appointmentDetail({ date, time, ticket }: Appointment, today: CalendarDate): string {
  const day = date === today ? 'Hoy' : capitalize(formatLongDate(date))
  return `${day} a las ${time} · Ticket ${ticket}`
}

type OriginOptionProps = {
  groupName: string
  name: string
  detail?: string
  isChosen: boolean
  onChoose: () => void
}

const FOCUS_RING_CLASSES =
  'has-[input:focus-visible]:outline-3 has-[input:focus-visible]:-outline-offset-3 has-[input:focus-visible]:outline-focus'

// The radio is named by the client and described by the appointment, so a screen
// reader says who first. The circle is drawn by the label; the input stays for keyboard
// and screen readers.
function OriginOption({ groupName, name, detail, isChosen, onChoose }: OriginOptionProps) {
  const nameId = useId()
  const detailId = useId()

  return (
    <label
      className={`flex min-h-16 cursor-pointer items-center gap-3 border-t border-separator px-4 py-2.5 first:border-t-0 ${FOCUS_RING_CLASSES}`}
    >
      <input
        type="radio"
        name={groupName}
        checked={isChosen}
        onChange={onChoose}
        aria-labelledby={nameId}
        aria-describedby={detail ? detailId : undefined}
        className="peer sr-only"
      />
      <span className="flex min-w-0 flex-1 flex-col">
        <span id={nameId} className="text-title-md font-bold text-on-surface">
          {name}
        </span>
        {detail && (
          <span id={detailId} className="text-body-md font-medium tabular-nums text-on-surface-variant">
            {detail}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className="flex size-6.5 shrink-0 items-center justify-center rounded-full border-2 border-outline text-transparent peer-checked:border-primary peer-checked:bg-primary peer-checked:text-on-primary"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12.5 4.5 4.5L19 7.5" />
        </svg>
      </span>
    </label>
  )
}
