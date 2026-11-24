import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../services/api-client'
import { button, findDay, renderAgendaCalendar, renderDayView } from './calendar-test-kit'
import { renderCatalog, activeServices } from './catalog-test-kit'
import { clientList, renderClients } from './clients-test-kit'
import { InMemoryAgendaRepository } from './in-memory-agenda-repository'
import { InMemoryCatalogRepository } from './in-memory-catalog-repository'
import { InMemoryClientsRepository } from './in-memory-clients-repository'

const CONNECTION_FAILED = 'No pudimos conectar con el servidor. Revisa que la API esté encendida.'
// What fetch throws when the server does not answer at all.
const NETWORK_FAILURE = new TypeError('Failed to fetch')
const REFUSED = new ApiError(403, 'forbidden', 'Tu cuenta no es de administradora.')

afterEach(() => {
  vi.restoreAllMocks()
})

describe('A screen whose data fails to load', () => {
  it('shows the API refusal in the catálogo and loads it again on "Reintentar"', async () => {
    vi.spyOn(InMemoryCatalogRepository.prototype, 'services').mockRejectedValueOnce(REFUSED)
    renderCatalog()

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu cuenta no es de administradora.')
    await userEvent.click(retry())

    expect(await activeServices()).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('says the server is unreachable in clientes and loads them again on "Reintentar"', async () => {
    vi.spyOn(InMemoryClientsRepository.prototype, 'clients').mockRejectedValueOnce(NETWORK_FAILURE)
    renderClients()

    expect(await screen.findByRole('alert')).toHaveTextContent(CONNECTION_FAILED)
    await userEvent.click(retry())

    expect(await clientList()).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows what failed in the calendar month and loads it again on "Reintentar"', async () => {
    vi.spyOn(InMemoryAgendaRepository.prototype, 'appointmentsBetween').mockRejectedValueOnce(NETWORK_FAILURE)
    renderAgendaCalendar()

    expect(await screen.findByRole('alert')).toHaveTextContent(CONNECTION_FAILED)
    await userEvent.click(retry())

    expect(await findDay('Sábado 24 de octubre')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows what failed in Mi horario and loads it again on "Reintentar"', async () => {
    await renderDayView()
    vi.spyOn(InMemoryAgendaRepository.prototype, 'weeklySchedule').mockRejectedValueOnce(REFUSED)
    await userEvent.click(button('Mi horario'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Tu cuenta no es de administradora.')
    await userEvent.click(retry())

    expect(await screen.findByRole('heading', { level: 2, name: 'Mi horario' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

function retry(): HTMLElement {
  return screen.getByRole('button', { name: 'Reintentar' })
}
