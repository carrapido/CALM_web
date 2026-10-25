import { Icon } from '../../shared/ui/atoms/Icon'
import { ORDER_STEPS, type OrderStep } from '../domain/order'
import { STEP_LABELS } from './order-labels'

// Done steps show a check and the current one is filled black, so the state never
// depends on color alone.
export function OrderStepper({ current }: { current: OrderStep }) {
  const currentIndex = ORDER_STEPS.indexOf(current)

  return (
    <ol aria-label="Estado del pedido" className="grid grid-cols-4 gap-space-xs">
      {ORDER_STEPS.map((step, index) => (
        <li
          key={step}
          aria-current={index === currentIndex ? 'step' : undefined}
          className={`flex min-h-12 items-center justify-center gap-0.5 rounded-lg px-space-xs text-center text-label-lg ${stepClasses(index, currentIndex)}`}
        >
          {index < currentIndex && <Icon name="check" className="text-[18px]" />}
          {STEP_LABELS[step]}
        </li>
      ))}
    </ol>
  )
}

function stepClasses(index: number, currentIndex: number): string {
  if (index === currentIndex) return 'bg-black font-semibold text-white'
  if (index < currentIndex) return 'bg-surface-container-high text-on-surface'
  return 'border border-outline-variant text-on-surface-variant'
}
