import { Button } from '../../../shared/ui/atoms/Button'

type OrderRegisteredProps = {
  ticket: string
  onDone: () => void
}

// The ticket in large digits: the admin copies it onto the client's paper receipt.
export function OrderRegistered({ ticket, onDone }: OrderRegisteredProps) {
  return (
    <div className="mt-space-lg flex flex-col items-center gap-space-md rounded-xl border-2 border-primary bg-surface-container-lowest p-space-lg text-center">
      <h2 className="text-headline-lg text-on-surface">Pedido registrado</h2>
      <p className="rounded-lg bg-secondary-container px-space-lg py-space-md text-display-lg tabular-nums text-on-secondary-fixed">
        Ticket {ticket}
      </p>
      <p className="text-title-md text-on-surface">Anota este número en el recibo del cliente.</p>
      <Button variant="primary" icon="checkroom" onClick={onDone}>
        Ver pedidos
      </Button>
    </div>
  )
}
