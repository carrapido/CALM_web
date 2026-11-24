import { Icon } from './Icon'

type BrandMarkProps = {
  size: keyof typeof GLYPH_CLASSES
}

// The sidebar shows the scissors in an ink badge; the phone header only the bare glyph.
const GLYPH_CLASSES = {
  regular: 'size-8 rounded-[9px] bg-primary text-on-primary',
  small: 'text-on-surface-variant',
}

export function BrandMark({ size }: BrandMarkProps) {
  return (
    <div className="flex items-center gap-space-sm">
      <span className={`flex items-center justify-center ${GLYPH_CLASSES[size]}`}>
        <Icon name="content_cut" />
      </span>
      <span className="text-label-technical text-on-surface-variant uppercase">
        Costurando a la medida
      </span>
    </div>
  )
}
