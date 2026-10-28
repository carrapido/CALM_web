import type { AgendaRepository } from '../agenda/application/agenda-repository'
import { AgendaPage } from '../agenda/ui/AgendaPage'
import type { CatalogRepository } from '../catalog/application/catalog-repository'
import { CatalogPage } from '../catalog/ui/CatalogPage'
import type { OrdersRepository } from '../orders/application/orders-repository'
import { OrdersPage } from '../orders/ui/OrdersPage'
import { AdminShell } from './layout/AdminShell'
import { useCurrentPage, type Page } from './navigation'

type AppProps = {
  agendaRepository: AgendaRepository
  ordersRepository: OrdersRepository
  catalogRepository: CatalogRepository
  now: () => Date
  random: () => number
}

export function App(props: AppProps) {
  const currentPage = useCurrentPage()

  return (
    <AdminShell currentPageId={currentPage.id}>
      <PageContent page={currentPage} {...props} />
    </AdminShell>
  )
}

function PageContent({
  page,
  agendaRepository,
  ordersRepository,
  catalogRepository,
  now,
  random,
}: AppProps & { page: Page }) {
  switch (page.id) {
    case 'agenda':
      return <AgendaPage repository={agendaRepository} now={now} />
    case 'pedidos':
      return (
        <OrdersPage
          ordersRepository={ordersRepository}
          agendaRepository={agendaRepository}
          now={now}
          random={random}
        />
      )
    case 'catalogo':
      return <CatalogPage repository={catalogRepository} />
    default:
      return null
  }
}
