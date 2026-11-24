import { ApiError } from '../services/api-client'
import { Button } from './Button'

const CONNECTION_FAILED = 'No pudimos conectar con el servidor. Revisa que la API esté encendida.'

type LoadErrorProps = {
  error: unknown
  onRetry: () => void
  className?: string
}

// Shown instead of "Cargando…" when the data failed to load, so a screen never waits forever.
export function LoadError({ error, onRetry, className = '' }: LoadErrorProps) {
  return (
    <div className={`flex flex-col gap-space-md rounded-lg bg-error-container p-space-md ${className}`}>
      <p role="alert" className="text-on-error-container">
        {messageOf(error)}
      </p>
      <Button icon="refresh" onClick={onRetry} className="sm:self-start">
        Reintentar
      </Button>
    </div>
  )
}

// The API explains its refusals; anything else is fetch's TypeError for a server it cannot reach.
function messageOf(error: unknown): string {
  return error instanceof ApiError ? error.message : CONNECTION_FAILED
}
