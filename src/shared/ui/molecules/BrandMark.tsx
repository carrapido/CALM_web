import { Icon } from '../atoms/Icon'

type BrandMarkProps = {
  size: keyof typeof SIZE_CLASSES
}

const SIZE_CLASSES = {
  regular: { badge: 'size-9', icon: 'text-[20px]' },
  small: { badge: 'size-8', icon: 'text-[18px]' },
}

export function BrandMark({ size }: BrandMarkProps) {
  const classes = SIZE_CLASSES[size]

  return (
    <div className="flex items-center gap-space-sm">
      <div
        className={`${classes.badge} flex items-center justify-center rounded bg-primary-container text-on-primary`}
      >
        <Icon name="straighten" className={classes.icon} />
      </div>
      <span className="text-title-md tracking-tight text-on-surface uppercase">
        Costurando a la medida
      </span>
    </div>
  )
}
