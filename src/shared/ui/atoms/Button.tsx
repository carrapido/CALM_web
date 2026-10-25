import type { ButtonHTMLAttributes } from 'react'
import { BUTTON_BASE_CLASSES, VARIANT_CLASSES } from './button-classes'
import { Icon } from './Icon'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANT_CLASSES
  icon?: string
  iconAfter?: boolean
}

export function Button({
  variant = 'secondary',
  icon,
  iconAfter = false,
  type = 'button',
  className = '',
  children,
  ...buttonAttributes
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${BUTTON_BASE_CLASSES} ${VARIANT_CLASSES[variant]} ${iconAfter ? 'flex-row-reverse' : ''} ${className}`}
      {...buttonAttributes}
    >
      {icon && <Icon name={icon} className="text-[24px]" />}
      {children}
    </button>
  )
}
