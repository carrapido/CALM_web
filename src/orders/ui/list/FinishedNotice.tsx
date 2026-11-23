// The live region stays in the page, empty, so the notice is announced when it appears.
export function FinishedNotice({ notice }: { notice: string | undefined }) {
  return (
    <p
      role="status"
      className={
        notice ? 'rounded-xl bg-success-container px-5 py-4 text-title-md text-on-success-container' : 'sr-only'
      }
    >
      {notice}
    </p>
  )
}
