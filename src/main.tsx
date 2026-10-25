import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { InMemoryAgendaRepository } from './agenda/infrastructure/in-memory-agenda-repository'
import { sampleAgenda } from './agenda/infrastructure/sample-agenda'
import { App } from './app/App'
import { InMemoryCatalogRepository } from './catalog/infrastructure/in-memory-catalog-repository'
import { sampleCatalog } from './catalog/infrastructure/sample-catalog'
import { InMemoryOrdersRepository } from './orders/infrastructure/in-memory-orders-repository'
import { sampleOrders } from './orders/infrastructure/sample-orders'
import { todayInCancun } from './shared/domain/calendar-date'
import './index.css'

const rootElement = document.getElementById('root')
if (rootElement === null) throw new Error('index.html is missing the #root element')

const now = () => new Date()
const today = todayInCancun(now())
const agendaRepository = new InMemoryAgendaRepository(sampleAgenda(today))
const ordersRepository = new InMemoryOrdersRepository(sampleOrders(today))
const catalogRepository = new InMemoryCatalogRepository(sampleCatalog())

createRoot(rootElement).render(
  <StrictMode>
    <App
      agendaRepository={agendaRepository}
      ordersRepository={ordersRepository}
      catalogRepository={catalogRepository}
      now={now}
      random={Math.random}
    />
  </StrictMode>,
)
