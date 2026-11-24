import type { ReactNode } from 'react'
import { Button } from './Button'
import { Icon } from './Icon'
import { BrandMark } from './BrandMark'
import { SECTIONS, pageHref, type Page, type PageId } from '../hooks/navigation'

type AdminShellProps = {
  currentPageId: PageId
  onSignOut: () => void
  children: ReactNode
}

// Phone first: below md the navigation is a bottom tab bar within thumb reach;
// from md up the same <nav> sits in a left sidebar.
export function AdminShell({ currentPageId, onSignOut, children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <MobileHeader onSignOut={onSignOut} />
      <aside className="md:fixed md:inset-y-0 md:left-0 md:flex md:w-72 md:flex-col md:gap-7 md:border-r md:border-separator md:bg-surface-container-lowest md:px-space-md md:pt-7 md:pb-5">
        <div className="hidden px-3 md:block">
          <BrandMark size="regular" />
        </div>
        <AdminNavigation currentPageId={currentPageId} />
        <AdminIdentity onSignOut={onSignOut} />
      </aside>
      {/* pb-24 keeps the last content above the bottom tab bar. */}
      <main className="pb-24 md:ml-72 md:pb-0">{children}</main>
    </div>
  )
}

function MobileHeader({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="flex min-h-11 items-center justify-between gap-space-sm px-margin pt-space-md md:hidden">
      <BrandMark size="small" />
      {/* A plain 44px row, as tall as the header, so it does not compete with the page. */}
      <button
        type="button"
        onClick={onSignOut}
        className="flex min-h-11 items-center gap-1 rounded-lg px-space-sm text-label-lg text-on-surface-variant transition-colors hover:bg-fill"
      >
        <Icon name="logout" className="text-[20px]" />
        Cerrar sesión
      </button>
    </header>
  )
}

// Content scrolls under the tab bar, so it is a translucent material (solid when the
// system asks for less transparency). max-md keeps these styles out of the sidebar.
const TAB_BAR_CLASSES = [
  'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-40',
  'max-md:grid max-md:auto-cols-fr max-md:grid-flow-col max-md:gap-space-sm max-md:p-space-sm',
  'max-md:border-t max-md:border-separator max-md:bg-background/82',
  'max-md:backdrop-blur-xl max-md:backdrop-saturate-180',
  'max-md:reduced-transparency:bg-background max-md:reduced-transparency:backdrop-filter-none',
].join(' ')

const SIDEBAR_LIST_CLASSES = 'md:flex md:flex-1 md:flex-col md:gap-space-xs'

function AdminNavigation({ currentPageId }: { currentPageId: PageId }) {
  return (
    <nav aria-label="Navegación del panel" className={`${TAB_BAR_CLASSES} ${SIDEBAR_LIST_CLASSES}`}>
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

// A tab on the phone (icon over label), a row in the sidebar (icon beside label).
const LINK_LAYOUT_CLASSES =
  'flex h-16 flex-col items-center justify-center gap-0.5 rounded-lg text-label-lg transition-colors md:h-12.5 md:flex-row md:justify-start md:gap-3 md:px-3.5 md:text-title-md'

// The current page is a filled pill: a tint on the phone, solid ink in the sidebar.
const CURRENT_LINK_CLASSES =
  'bg-fill-strong font-extrabold text-on-surface md:bg-primary md:font-bold md:text-on-primary'
const OTHER_LINK_CLASSES = 'text-on-surface-variant hover:bg-fill md:text-on-surface'

function NavigationLink({ page, isCurrent }: NavigationLinkProps) {
  const linkState = isCurrent ? CURRENT_LINK_CLASSES : OTHER_LINK_CLASSES
  // The filled glyph marks the current page by shape, not only by color.
  const iconState = isCurrent ? "[font-variation-settings:'FILL'_1]" : ''

  return (
    <a
      href={pageHref(page.id)}
      aria-current={isCurrent ? 'page' : undefined}
      className={`${LINK_LAYOUT_CLASSES} ${linkState}`}
    >
      <Icon name={page.icon} className={iconState} />
      {page.label}
    </a>
  )
}

function AdminIdentity({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="hidden flex-col gap-space-sm border-t border-separator pt-3.5 md:flex">
      <div className="flex items-center gap-3 px-3">
        <span
          aria-hidden="true"
          className="flex size-10 items-center justify-center rounded-full bg-fill-strong text-label-lg font-extrabold text-on-surface"
        >
          A
        </span>
        <span className="text-title-md font-bold text-on-surface">Administradora</span>
      </div>
      <Button icon="logout" onClick={onSignOut}>
        Cerrar sesión
      </Button>
    </div>
  )
}
