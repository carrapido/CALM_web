import type { ReactNode } from 'react'

type PageFrameProps = {
  title: string
  // A page-level control shown beside the title.
  action?: ReactNode
  children?: ReactNode
}

export function PageFrame({ title, action, children }: PageFrameProps) {
  return (
    <section className="px-margin py-space-lg md:px-margin-desktop md:py-space-xl">
      <div className="flex flex-wrap items-center justify-between gap-space-md">
        <h1 className="text-display-lg-mobile text-primary md:text-display-lg">{title}</h1>
        {action}
      </div>
      {children}
    </section>
  )
}
