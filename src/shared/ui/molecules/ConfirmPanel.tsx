import { Button } from '../atoms/Button'

type ConfirmPanelProps = {
  // danger for actions that remove something; neutral for a normal step that ends a task.
  tone?: keyof typeof TONES
  question: string
  detail?: string
  confirmLabel: string
  keepLabel: string
  onConfirm: () => void
  onKeep: () => void
}

const TONES = {
  danger: { panel: 'bg-error-container text-on-error-container', confirm: 'danger' },
  neutral: { panel: 'bg-surface-container text-on-surface', confirm: 'primary' },
} as const

// Inline, where the admin tapped: a modal would cover the screen and lose her place.
// Both buttons say what they do, never a bare "Aceptar" / "Cancelar".
export function ConfirmPanel({
  tone = 'danger',
  question,
  detail,
  confirmLabel,
  keepLabel,
  onConfirm,
  onKeep,
}: ConfirmPanelProps) {
  return (
    <div className={`flex flex-col gap-space-sm rounded-lg p-space-md ${TONES[tone].panel}`}>
      <p className="text-title-md">{question}</p>
      {detail && <p>{detail}</p>}
      <div className="grid gap-space-sm sm:grid-cols-2">
        <Button variant={TONES[tone].confirm} onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button onClick={onKeep}>{keepLabel}</Button>
      </div>
    </div>
  )
}
