import { STATUS_LABELS } from '../../../orders/ui/order-labels'
import { Icon } from '../../../shared/ui/atoms/Icon'
import type { CalendarEntry, CalendarFilter, OrderTone } from '../../domain/calendar-entries'

type ChipTone = 'appointment' | OrderTone

// The appointment blue is new (design/agenda-calendario, --color-appt): the same family as
// the focus blue, with ink that passes AA on its tint.
const TONE_CLASSES: Record<ChipTone, string> = {
  appointment: 'bg-[#e7efff] text-[#0a3f9c]',
  active: 'bg-secondary-container text-on-secondary-fixed',
  ready: 'bg-success-container text-on-success-container',
  finished: 'bg-fill text-on-surface',
}

const CHOSEN_CLASSES = 'shadow-[inset_0_0_0_2px_var(--color-primary)]'

type EntryChipProps = {
  entry: CalendarEntry
  isChosen: boolean
  onChoose: (entry: CalendarEntry) => void
}

// The type is in words, not only in color: an appointment starts with its time, an order
// with the garment glyph and its ticket, and the name says "Cita" or "Entrega". On the
// phone the chip shrinks to a colored bar, its name still read out.
export function EntryChip({ entry, isChosen, onChoose }: EntryChipProps) {
  return (
    <button
      type="button"
      title={chipTitle(entry)}
      aria-label={chipName(entry)}
      aria-current={isChosen ? 'true' : undefined}
      onClick={() => onChoose(entry)}
      className={`flex w-full min-w-0 items-center gap-0.5 rounded-full px-[7px] py-0.5 text-left text-[12px] leading-[17px] font-extrabold whitespace-nowrap transition-[filter] hover:brightness-[.97] max-md:h-1.5 max-md:p-0 ${TONE_CLASSES[toneOf(entry)]} ${isChosen ? CHOSEN_CLASSES : ''}`}
    >
      {entry.kind === 'order' && (
        <span className="-ml-0.5 flex max-md:hidden">
          <Icon name="checkroom" className="text-[14px]" />
        </span>
      )}
      <span className="min-w-0 overflow-hidden text-ellipsis max-md:hidden">{chipText(entry)}</span>
    </button>
  )
}

function toneOf(entry: CalendarEntry): ChipTone {
  return entry.kind === 'appointment' ? 'appointment' : entry.tone
}

function chipText(entry: CalendarEntry): string {
  if (entry.kind === 'appointment') return `${entry.appointment.time} ${entry.appointment.clientName}`
  return `${entry.order.ticket} ${entry.order.clientName}`
}

// "Cita 10:30 · María López" or "Entrega 7720 · Carlos Ruiz · Listo para recoger".
function chipTitle(entry: CalendarEntry): string {
  if (entry.kind === 'appointment') return `Cita ${entry.appointment.time} · ${entry.appointment.clientName}`
  const { ticket, clientName, status } = entry.order
  return `Entrega ${ticket} · ${clientName} · ${STATUS_LABELS[status]}`
}

function chipName(entry: CalendarEntry): string {
  if (entry.kind === 'appointment') {
    const { time, clientName, ticket } = entry.appointment
    return `Cita por recibir, ${time}, ${clientName}, ticket ${ticket}`
  }
  const { ticket, clientName, status } = entry.order
  return `Entrega del pedido ${ticket}, ${clientName}, ${STATUS_LABELS[status]}`
}

const LEGEND_LABELS: Record<ChipTone, string> = {
  appointment: 'Cita por recibir',
  active: 'Entrega de pedido',
  ready: 'Listo para recoger o cliente en camino',
  finished: 'Pedido terminado',
}

// Names each color the month shows under the chosen filter.
export function ChipLegend({ filter }: { filter: CalendarFilter }) {
  return (
    <ul aria-label="Qué significa cada color" className="flex flex-wrap items-center gap-space-sm">
      {legendTones(filter).map((tone) => (
        <li
          key={tone}
          className={`flex items-center gap-0.5 rounded-full px-2.5 py-1 text-label-lg font-extrabold ${TONE_CLASSES[tone]}`}
        >
          {tone !== 'appointment' && <Icon name="checkroom" className="text-[16px]" />}
          {LEGEND_LABELS[tone]}
        </li>
      ))}
    </ul>
  )
}

function legendTones({ show, orders }: CalendarFilter): ChipTone[] {
  if (show === 'appointments') return ['appointment']
  if (show === 'orders') return orders === 'finished' ? ['finished'] : ['active', 'ready']
  return ['appointment', 'active', 'ready']
}
