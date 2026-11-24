import { InMemoryAgendaRepository } from './in-memory-agenda-repository'
import { InMemoryCatalogRepository } from './in-memory-catalog-repository'
import { InMemoryClientsRepository } from './in-memory-clients-repository'
import { InMemoryOrdersRepository } from './in-memory-orders-repository'
import type { AppProps } from '../App'

// A panel with no appointments, orders, services or clients, for tests about the shell around them.
export function emptyPanelProps(onSignOut: () => void = () => {}): AppProps {
  return {
    agendaRepository: new InMemoryAgendaRepository({
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
    }),
    ordersRepository: new InMemoryOrdersRepository([]),
    catalogRepository: new InMemoryCatalogRepository([]),
    clientsRepository: new InMemoryClientsRepository([]),
    now: () => new Date(),
    random: Math.random,
    onSignOut,
  }
}
