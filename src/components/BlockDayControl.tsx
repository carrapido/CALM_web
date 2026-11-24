import { useState } from 'react'
import { Button } from './Button'
import { ConfirmPanel } from './ConfirmPanel'
import type { CalendarDate } from '../utils/calendar-date'
import { formatCount, formatLongDate } from '../utils/format'

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
        detail="Tus clientes no podrán agendar ese día. Puedes desbloquearlo cuando quieras."
        confirmLabel="Sí, bloquear el día"
        keepLabel="No, dejarlo abierto"
        onConfirm={onBlock}
        onKeep={() => setStep('idle')}
      />
    )
  }

  return (
    <div className="mt-space-sm flex flex-col gap-space-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-container-lowest px-5 py-4">
        <p className="text-title-md text-on-surface">¿No vas a abrir este día?</p>
        <Button icon="block" onClick={askToBlock}>
          Bloquear este día
        </Button>
      </div>
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
