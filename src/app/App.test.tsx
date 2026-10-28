import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAgendaRepository } from '../agenda/infrastructure/in-memory-agenda-repository'
import { InMemoryCatalogRepository } from '../catalog/infrastructure/in-memory-catalog-repository'
import { InMemoryOrdersRepository } from '../orders/infrastructure/in-memory-orders-repository'
import { App } from './App'

describe('Admin shell navigation', () => {
  beforeEach(() => {
    window.location.hash = ''
  })

  it('shows Agenda and marks it as current when there is no hash', () => {
    renderApp()

    expect(pageHeading('Agenda')).toBeInTheDocument()
    expect(navigationLink('Agenda')).toHaveAttribute('aria-current', 'page')
  })

  it('shows the clicked page and moves the current mark to its link', async () => {
    renderApp()

    await userEvent.click(navigationLink('Pedidos'))

    expect(await screen.findByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
    expect(navigationLink('Pedidos')).toHaveAttribute('aria-current', 'page')
    expect(navigationLink('Agenda')).not.toHaveAttribute('aria-current')
  })

  it('shows the page named in the hash when the app opens', () => {
    window.location.hash = '#/catalogo'

    renderApp()

    expect(pageHeading('Catálogo')).toBeInTheDocument()
  })

  it('falls back to Agenda when the hash names no page', () => {
    window.location.hash = '#/mis-citas'

    renderApp()

    expect(pageHeading('Agenda')).toBeInTheDocument()
  })

  it('lists the three admin sections', () => {
    renderApp()

    const expectedNames = ['Agenda', 'Pedidos', 'Catálogo']
    const links = within(adminNavigation()).getAllByRole('link')

    expect(links).toHaveLength(expectedNames.length)
    links.forEach((link, index) => expect(link).toHaveAccessibleName(expectedNames[index]))
  })

  it('shows the admin identity without making it a navigation link', () => {
    renderApp()

    expect(screen.getByText('Administradora')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Administradora' })).not.toBeInTheDocument()
  })

})

function renderApp() {
  const agendaRepository = new InMemoryAgendaRepository({
    schedule: {
      monday: { isOpen: false },
      tuesday: { isOpen: false },
      wednesday: { isOpen: false },
      thursday: { isOpen: false },
      friday: { isOpen: false },
      saturday: { isOpen: false },
      sunday: { isOpen: false },
    },
    appointments: [],
  })
  render(
    <App
      agendaRepository={agendaRepository}
      ordersRepository={new InMemoryOrdersRepository([])}
      catalogRepository={new InMemoryCatalogRepository([])}
      now={() => new Date()}
      random={Math.random}
    />,
  )
}

function pageHeading(name: string): HTMLElement {
  return screen.getByRole('heading', { level: 1, name })
}

function navigationLink(name: string): HTMLElement {
  return within(adminNavigation()).getByRole('link', { name })
}

function adminNavigation(): HTMLElement {
  return screen.getByRole('navigation', { name: 'Navegación del panel' })
}
