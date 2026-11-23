import type { ReactNode } from 'react'
import { Icon } from '../atoms/Icon'

type PeriodChangerProps = {
  // Names the group, e.g. "Cambiar de día".
  label: string
  previousLabel: string
  nextLabel: string
  // True on the period that holds today, which switches "Hoy" off.
  isCurrent: boolean
  onPrevious: () => void
  onToday: () => void
  onNext: () => void
}

// "Anterior | Hoy | Siguiente" in one box. "Hoy" stays in place and is only switched off
// on the current period, so the admin always finds it.
export function PeriodChanger({
  label,
  previousLabel,
  nextLabel,
  isCurrent,
  onPrevious,
  onToday,
  onNext,
}: PeriodChangerProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex w-full shrink-0 items-stretch rounded-lg bg-surface-container-lowest shadow-[0_0_0_1px_var(--color-separator)] @2xl:w-auto"
    >
      <ChangerButton onClick={onPrevious}>
        <Icon name="chevron_left" />
        {previousLabel}
      </ChangerButton>
      <ChangerDivider />
      <ChangerButton onClick={onToday} disabled={isCurrent}>
        Hoy
      </ChangerButton>
      <ChangerDivider />
      <ChangerButton onClick={onNext}>
        {nextLabel}
        <Icon name="chevron_right" />
      </ChangerButton>
    </div>
  )
}

type ChangerButtonProps = {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}

function ChangerButton({ onClick, disabled = false, children }: ChangerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 flex-1 items-center justify-center gap-0.5 px-3 text-body-lg font-semibold whitespace-nowrap text-on-surface transition-colors hover:bg-fill disabled:text-outline disabled:hover:bg-transparent @2xl:flex-none @2xl:px-4"
    >
      {children}
    </button>
  )
}

function ChangerDivider() {
  return <span aria-hidden="true" className="my-2.5 w-px bg-fill-strong" />
}
