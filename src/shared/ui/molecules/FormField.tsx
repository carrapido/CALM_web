import { useId, type ReactNode } from 'react'

export type FieldControlProps = {
  id: string
  'aria-invalid': boolean
  'aria-describedby': string | undefined
}

type FormFieldProps = {
  label: string
  error: string | undefined
  children: (controlProps: FieldControlProps) => ReactNode
}

// The message sits under its field and is tied to it, so a screen reader reads both.
export function FormField({ label, error, children }: FormFieldProps) {
  const id = useId()
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-space-xs">
      <label htmlFor={id} className="text-title-md text-on-surface">
        {label}
      </label>
      {children({ id, 'aria-invalid': error !== undefined, 'aria-describedby': error && errorId })}
      {error && (
        <p id={errorId} className="text-error">
          {error}
        </p>
      )}
    </div>
  )
}
