import { render, screen, within } from '@testing-library/react'
import { createElement } from 'react'
import type { Service } from '../domain/service'
import { InMemoryCatalogRepository } from '../infrastructure/in-memory-catalog-repository'
import { CatalogPage } from './CatalogPage'

const SERVICES: Service[] = [
  { id: 'hem', name: 'Dobladillo de pantalón', price: { kind: 'base', amountMxn: 120 }, estimatedDays: 2, isActive: true },
  { id: 'waist', name: 'Ajuste de cintura', price: { kind: 'base', amountMxn: 180 }, estimatedDays: 3, isActive: true },
  { id: 'zipper', name: 'Cambio de cierre', price: { kind: 'base', amountMxn: 130 }, estimatedDays: 0, isActive: true },
  { id: 'embroidery', name: 'Bordado', price: { kind: 'base', amountMxn: 250 }, estimatedDays: 7, isActive: false },
]

export function renderCatalog() {
  render(createElement(CatalogPage, { repository: new InMemoryCatalogRepository(SERVICES) }))
}

export function activeServices(): Promise<HTMLElement> {
  return screen.findByRole('list', { name: 'Servicios activos' })
}

export function inactiveServices(): Promise<HTMLElement> {
  return screen.findByRole('list', { name: 'Servicios desactivados' })
}

export async function serviceCard(list: Promise<HTMLElement>, name: string): Promise<HTMLElement> {
  const cards = within(await list).getAllByRole('listitem')
  const card = cards.find((item) => item.textContent?.includes(name))
  if (card === undefined) throw new Error(`No service card for ${name}`)
  return card
}

export function field(label: string): HTMLElement {
  return screen.getByLabelText(label)
}

export function button(name: string): HTMLElement {
  return screen.getByRole('button', { name })
}
