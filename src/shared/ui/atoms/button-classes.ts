// Shared by <Button> and by links that must look like one.
// 56px tall with a visible text label: large targets for an older admin.
export const BUTTON_BASE_CLASSES =
  'flex min-h-14 items-center justify-center gap-space-xs rounded-lg px-space-md text-title-md transition-colors'

export const VARIANT_CLASSES = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container',
  secondary:
    'border-2 border-primary bg-surface-container-lowest text-primary hover:bg-surface-container-high',
  danger: 'bg-error text-on-error hover:bg-on-error-container',
}
