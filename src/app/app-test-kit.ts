import { InMemoryAgendaRepository } from '../agenda/infrastructure/in-memory-agenda-repository'
import { InMemoryCatalogRepository } from '../catalog/infrastructure/in-memory-catalog-repository'
import { InMemoryOrdersRepository } from '../orders/infrastructure/in-memory-orders-repository'
import type { AppProps } from './App'

// A panel with no appointments, orders or services, for tests about the shell around them.
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
    now: () => new Date(),
    random: Math.random,
    onSignOut,
  }
}
