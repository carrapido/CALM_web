type IconProps = {
  name: string
  className?: string
}

// Material Symbols draws the glyph from the ligature text, which screen readers
// would otherwise read aloud, so every icon is decorative.
export function Icon({ name, className = '' }: IconProps) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${className}`}>
      {name}
    </span>
  )
}
