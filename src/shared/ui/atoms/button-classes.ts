// Shared by <Button> and by links that must look like one.
// 56px tall with a visible text label: large targets for an older admin.
export const BUTTON_BASE_CLASSES =
  'flex min-h-14 items-center justify-center gap-space-xs rounded-lg px-space-md text-title-md font-bold transition-colors'

export const VARIANT_CLASSES = {
  primary: 'bg-primary text-on-primary hover:bg-primary-container',
  secondary: 'bg-fill text-on-surface hover:bg-fill-strong',
  danger: 'bg-error text-on-error hover:bg-on-error-container',
  // A destructive action that is not the point of the screen: white, with red words.
  subtleDanger: 'bg-surface-container-lowest text-error hover:bg-error-container',
}
