import type { AgendaRepository } from './services/agenda-repository'
import { AgendaCalendarPage } from './pages/AgendaCalendarPage'
import type { CatalogRepository } from './services/catalog-repository'
import { CatalogPage } from './pages/CatalogPage'
import type { ClientsRepository } from './services/clients-repository'
import { ClientsPage } from './pages/ClientsPage'
import type { OrdersRepository } from './services/orders-repository'
import { AdminShell } from './components/AdminShell'
import { useCurrentPage, type Page } from './hooks/navigation'

export type AppProps = {
  agendaRepository: AgendaRepository
  ordersRepository: OrdersRepository
  catalogRepository: CatalogRepository
  clientsRepository: ClientsRepository
  now: () => Date
  random: () => number
  onSignOut: () => void
}

export function App({ onSignOut, ...pageProps }: AppProps) {
  const currentPage = useCurrentPage()

  return (
    <AdminShell currentPageId={currentPage.id} onSignOut={onSignOut}>
      <PageContent page={currentPage} {...pageProps} />
    </AdminShell>
  )
}

type PageContentProps = Omit<AppProps, 'onSignOut'> & { page: Page }

function PageContent({
  page,
  agendaRepository,
  ordersRepository,
  catalogRepository,
  clientsRepository,
  now,
  random,
}: PageContentProps) {
  switch (page.id) {
    case 'agenda':
      return (
        <AgendaCalendarPage
          agendaRepository={agendaRepository}
          ordersRepository={ordersRepository}
          now={now}
          random={random}
        />
      )
    case 'catalogo':
      return <CatalogPage repository={catalogRepository} />
    case 'clientes':
      return <ClientsPage repository={clientsRepository} />
    default:
      return null
  }
}
