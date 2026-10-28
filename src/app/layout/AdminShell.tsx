import type { ReactNode } from 'react'
import { Icon } from '../../shared/ui/atoms/Icon'
import { BrandMark } from '../../shared/ui/molecules/BrandMark'
import { SECTIONS, pageHref, type Page, type PageId } from '../navigation'

type AdminShellProps = {
  currentPageId: PageId
  children: ReactNode
}

// Phone first: below md the navigation is a bottom tab bar within thumb reach;
// from md up the same <nav> sits in a left sidebar.
export function AdminShell({ currentPageId, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <MobileTopBar />
      <aside className="md:fixed md:inset-y-0 md:left-0 md:flex md:w-72 md:flex-col md:border-r md:border-surface-container-highest md:bg-surface-container-lowest">
        <div className="hidden px-space-md py-space-lg md:block">
          <BrandMark size="regular" />
        </div>
        <AdminNavigation currentPageId={currentPageId} />
        <AdminIdentity />
      </aside>
      {/* pb-20 keeps the last content above the h-16 bottom tab bar. */}
      <main className="pb-20 md:ml-72 md:pb-0">{children}</main>
    </div>
  )
}

function MobileTopBar() {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center border-b border-surface-container-highest bg-surface/90 px-margin backdrop-blur-md md:hidden">
      <BrandMark size="small" />
    </header>
  )
}

function AdminNavigation({ currentPageId }: { currentPageId: PageId }) {
  return (
    <nav
      aria-label="Navegación del panel"
      className="fixed inset-x-0 bottom-0 z-40 grid auto-cols-fr grid-flow-col border-t border-surface-container-highest bg-surface-container-lowest md:static md:flex md:flex-1 md:flex-col md:gap-space-xs md:border-t-0 md:px-space-md"
    >
      {SECTIONS.map((page) => (
        <NavigationLink key={page.id} page={page} isCurrent={page.id === currentPageId} />
      ))}
    </nav>
  )
}

type NavigationLinkProps = {
  page: Page
  isCurrent: boolean
}

function NavigationLink({ page, isCurrent }: NavigationLinkProps) {
  const linkState = isCurrent
    ? 'font-semibold text-black md:bg-black md:text-white'
    : 'text-on-surface-variant hover:text-on-surface md:hover:bg-surface-container-high'
  // The filled glyph marks the current page by shape, not only by color.
  const iconState = isCurrent ? "[font-variation-settings:'FILL'_1]" : ''

  return (
    <a
      href={pageHref(page.id)}
      aria-current={isCurrent ? 'page' : undefined}
      className={`flex h-16 flex-col items-center justify-center gap-0.5 text-label-lg transition-colors md:h-12 md:flex-row md:justify-start md:gap-space-sm md:rounded-lg md:px-space-md md:text-body-lg ${linkState}`}
    >
      <Icon name={page.icon} className={`text-[24px] ${iconState}`} />
      {page.label}
    </a>
  )
}

function AdminIdentity() {
  return (
    <div className="hidden items-center gap-space-sm border-t border-surface-container-highest px-space-md py-space-md md:flex">
      <div className="flex size-9 items-center justify-center rounded-full bg-primary">
        <Icon name="person" className="text-[20px] text-on-primary" />
      </div>
      <span className="text-title-md text-on-surface">Administradora</span>
    </div>
  )
}
