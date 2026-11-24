type SegmentedControlProps<Value extends string> = {
  // Names the group for screen readers, e.g. "Vista".
  label: string
  options: readonly { value: Value; label: string }[]
  value: Value
  onChange: (value: Value) => void
}

// Apple's segmented control: one choice among a few, the chosen one raised in white.
export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<Value>) {
  return (
    <div role="group" aria-label={label} className="flex self-start rounded-[13px] bg-fill p-[3px]">
      {options.map((option) => (
        <SegmentButton
          key={option.value}
          label={option.label}
          isSelected={option.value === value}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </div>
  )
}

type SegmentButtonProps = {
  label: string
  isSelected: boolean
  onSelect: () => void
}

function SegmentButton({ label, isSelected, onSelect }: SegmentButtonProps) {
  const stateClasses = isSelected
    ? 'bg-surface-container-lowest font-extrabold text-on-surface shadow-[0_1px_3px_rgb(15_23_42/0.14)]'
    : 'font-semibold text-on-surface-variant hover:text-on-surface'

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      onClick={onSelect}
      className={`min-h-12 min-w-26 rounded-[10px] px-4.5 text-body-md transition-colors ${stateClasses}`}
    >
      {label}
    </button>
  )
}
