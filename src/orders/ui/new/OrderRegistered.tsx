import { Button } from '../../../shared/ui/atoms/Button'

type OrderRegisteredProps = {
  ticket: string
  onDone: () => void
}

// The ticket in large digits: the admin copies it onto the client's paper receipt.
export function OrderRegistered({ ticket, onDone }: OrderRegisteredProps) {
  return (
    <div className="mx-auto mt-space-lg flex w-full max-w-xl flex-col items-center gap-space-md rounded-[22px] bg-surface-container-lowest p-8 text-center shadow-card">
      <h2 className="text-headline-lg text-on-surface">Pedido registrado</h2>
      <p className="rounded-lg bg-fill px-space-lg py-space-md text-display-lg tabular-nums text-on-surface">
        Ticket {ticket}
      </p>
      <p className="text-title-md text-on-surface">Anota este número en el recibo del cliente.</p>
      <Button variant="primary" onClick={onDone} className="self-stretch">
        Ver pedidos
      </Button>
    </div>
  )
}
