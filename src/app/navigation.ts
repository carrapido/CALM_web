import { useSyncExternalStore } from 'react'

export const SECTIONS = [
  { id: 'agenda', label: 'Agenda', icon: 'calendar_month' },
  { id: 'pedidos', label: 'Pedidos', icon: 'checkroom' },
  { id: 'catalogo', label: 'Catálogo', icon: 'sell' },
] as const

// The profile is a page but not a work section: the layout places it apart.
export const PROFILE_PAGE = { id: 'perfil', label: 'Perfil', icon: 'person' } as const

const PAGES = [...SECTIONS, PROFILE_PAGE] as const

export type Page = (typeof PAGES)[number]
export type PageId = Page['id']

const HOME_PAGE: Page = SECTIONS[0]
const HASH_PREFIX = '#/'

export function useCurrentPage(): Page {
  const hash = useSyncExternalStore(subscribeToHashChange, readHash)
  return pageFromHash(hash)
}

export function pageHref(pageId: PageId): string {
  return HASH_PREFIX + pageId
}

function subscribeToHashChange(onHashChange: () => void): () => void {
  window.addEventListener('hashchange', onHashChange)
  return () => window.removeEventListener('hashchange', onHashChange)
}

function readHash(): string {
  return window.location.hash
}

function pageFromHash(hash: string): Page {
  const pageId = hash.slice(HASH_PREFIX.length)
  return PAGES.find((page) => page.id === pageId) ?? HOME_PAGE
}
