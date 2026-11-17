import type { ReactNode } from 'react'

type PageFrameProps = {
  title: string
  // A page-level control shown beside the title.
  action?: ReactNode
  children?: ReactNode
}

// Content stops at 1080px and stays centered: long lines are hard to follow on wide screens.
export function PageFrame({ title, action, children }: PageFrameProps) {
  return (
    <section className="mx-auto max-w-[1080px] px-margin py-space-lg md:px-margin-desktop md:py-10">
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <h1 className="text-display-lg-mobile text-on-surface md:text-display-lg">{title}</h1>
        {action}
      </div>
      {children}
    </section>
  )
}
