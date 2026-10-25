import { useId, useState, type FormEvent } from 'react'
import { Button } from '../../../shared/ui/atoms/Button'

type TicketSearchProps = {
  onSearch: (ticket: string) => void
}

export function TicketSearch({ onSearch }: TicketSearchProps) {
  const inputId = useId()
  const [ticket, setTicket] = useState('')
  const [isIncomplete, setIsIncomplete] = useState(false)

  const search = (event: FormEvent) => {
    event.preventDefault()
    const isComplete = /^\d{4}$/.test(ticket)
    setIsIncomplete(!isComplete)
    if (isComplete) onSearch(ticket)
  }

  return (
    <form onSubmit={search} role="search" className="flex flex-col gap-space-xs">
      <label htmlFor={inputId} className="text-title-md text-on-surface">
        Buscar por ticket
      </label>
      <div className="flex gap-space-sm">
        <input
          id={inputId}
          value={ticket}
          onChange={(event) => setTicket(event.target.value)}
          inputMode="numeric"
          maxLength={4}
          placeholder="1234"
          className="min-h-14 w-32 rounded-lg border-2 border-outline bg-surface-container-lowest px-space-md text-headline-md tabular-nums text-on-surface"
        />
        <Button type="submit" icon="search">
          Buscar
        </Button>
      </div>
      {isIncomplete && <p className="text-error">Escribe los 4 números del ticket</p>}
    </form>
  )
}
