import { useState, type FormEvent } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'

type TicketSearchProps = {
  onSearch: (ticket: string) => void
}

const FOCUS_RING_CLASSES =
  'has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus'

// Apple's search field: an icon and a hint inside the box. The label is visually hidden
// but names the field; the outline border stays, as for every field (WCAG 1.4.11).
export function TicketSearch({ onSearch }: TicketSearchProps) {
  const [ticket, setTicket] = useState('')
  const [isIncomplete, setIsIncomplete] = useState(false)

  const search = (event: FormEvent) => {
    event.preventDefault()
    const isComplete = /^\d{4}$/.test(ticket)
    setIsIncomplete(!isComplete)
    if (isComplete) onSearch(ticket)
  }

  return (
    <form onSubmit={search} role="search" className="flex min-w-0 flex-[1_1_20rem] flex-col gap-space-xs">
      <div className="flex gap-space-sm">
        <label
          className={`flex min-h-14 min-w-0 flex-1 items-center gap-2.5 rounded-lg border-2 border-outline bg-surface-container-lowest px-3.5 text-on-surface-variant ${FOCUS_RING_CLASSES}`}
        >
          <Icon name="search" />
          <span className="sr-only">Buscar por ticket</span>
          <input
            value={ticket}
            onChange={(event) => setTicket(event.target.value)}
            inputMode="numeric"
            maxLength={4}
            placeholder="Ticket de 4 números"
            className="min-w-0 flex-1 bg-transparent text-body-lg font-semibold tabular-nums text-on-surface outline-none placeholder:text-on-surface-variant"
          />
        </label>
        <Button type="submit">Buscar</Button>
      </div>
      {isIncomplete && <p className="text-error">Escribe los 4 números del ticket</p>}
    </form>
  )
}
