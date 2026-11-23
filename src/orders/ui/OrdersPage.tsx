import { useState } from 'react'
import type { AgendaRepository } from '../../agenda/application/agenda-repository'
import { todayInCancun } from '../../shared/domain/calendar-date'
import { Button } from '../../shared/ui/atoms/Button'
import { PageFrame } from '../../shared/ui/templates/PageFrame'
import type { OrdersRepository } from '../application/orders-repository'
import { OrdersContainer } from './list/OrdersContainer'
import { NewOrderContainer } from './new/NewOrderContainer'
import { OrderRegistered } from './new/OrderRegistered'

type OrdersPageProps = {
  ordersRepository: OrdersRepository
  agendaRepository: AgendaRepository
  now: () => Date
  random: () => number
}

type OrdersPageView = { name: 'orders' } | { name: 'newOrder' } | { name: 'registered'; ticket: string }

export function OrdersPage({ ordersRepository, agendaRepository, now, random }: OrdersPageProps) {
  const [view, setView] = useState<OrdersPageView>({ name: 'orders' })
  const today = todayInCancun(now())
  const showOrders = () => setView({ name: 'orders' })

  const newOrderButton = view.name === 'orders' && (
    <Button variant="primary" icon="add" onClick={() => setView({ name: 'newOrder' })}>
      Nuevo pedido
    </Button>
  )

  return (
    <PageFrame title="Pedidos" action={newOrderButton}>
      {view.name === 'orders' && (
        <OrdersContainer repository={ordersRepository} agendaRepository={agendaRepository} today={today} />
      )}
      {view.name === 'newOrder' && (
        <NewOrderContainer
          ordersRepository={ordersRepository}
          agendaRepository={agendaRepository}
          random={random}
          today={today}
          onRegistered={(ticket) => setView({ name: 'registered', ticket })}
          onCancel={showOrders}
        />
      )}
      {view.name === 'registered' && <OrderRegistered ticket={view.ticket} onDone={showOrders} />}
    </PageFrame>
  )
}
