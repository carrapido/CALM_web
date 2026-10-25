import { useState } from 'react'
import { Button } from '../../../shared/ui/atoms/Button'
import { ConfirmPanel } from '../../../shared/ui/molecules/ConfirmPanel'
import type { CalendarDate } from '../../../shared/domain/calendar-date'
import { formatCount, formatLongDate } from '../../../shared/ui/format'

type BlockDayControlProps = {
  date: CalendarDate
  appointmentCount: number
  onBlock: () => void
}

type BlockStep = 'idle' | 'confirming' | 'refused'

export function BlockDayControl({ date, appointmentCount, onBlock }: BlockDayControlProps) {
  const [step, setStep] = useState<BlockStep>('idle')

  // A day with appointments stays open, so no client is left without notice (P3).
  const askToBlock = () => setStep(appointmentCount > 0 ? 'refused' : 'confirming')

  if (step === 'confirming') {
    return (
      <ConfirmPanel
        question={`¿Bloquear el ${formatLongDate(date)}?`}
        detail="Ningún cliente podrá agendar ese día."
        confirmLabel="Sí, bloquear el día"
        keepLabel="No, dejarlo abierto"
        onConfirm={onBlock}
        onKeep={() => setStep('idle')}
      />
    )
  }

  return (
    <div className="flex flex-col gap-space-sm border-t border-surface-container-highest pt-space-lg">
      <p className="text-on-surface-variant">¿No vas a abrir este día?</p>
      <Button icon="block" onClick={askToBlock} className="sm:self-start">
        Bloquear este día
      </Button>
      {step === 'refused' && <RefusalMessage appointmentCount={appointmentCount} />}
    </div>
  )
}

function RefusalMessage({ appointmentCount }: { appointmentCount: number }) {
  const cancelThem = appointmentCount === 1 ? 'Cancélala primero.' : 'Cancélalas primero.'

  return (
    <p role="status" className="rounded-lg bg-error-container p-space-md text-on-error-container">
      {`Este día tiene ${formatCount(appointmentCount, 'cita', 'citas')}. ${cancelThem}`}
    </p>
  )
}
