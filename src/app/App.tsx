import type { AgendaRepository } from '../agenda/application/agenda-repository'
import { AgendaCalendarPage } from '../calendar/ui/AgendaCalendarPage'
import type { CatalogRepository } from '../catalog/application/catalog-repository'
import { CatalogPage } from '../catalog/ui/CatalogPage'
import type { ClientsRepository } from '../clients/application/clients-repository'
import { ClientsPage } from '../clients/ui/ClientsPage'
import type { OrdersRepository } from '../orders/application/orders-repository'
import { AdminShell } from './layout/AdminShell'
import { useCurrentPage, type Page } from './navigation'

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
