import { useState } from 'react'
import type { AgendaRepository } from '../../agenda/application/agenda-repository'
import type { Appointment } from '../../agenda/domain/appointment'
import { todayInCancun } from '../../shared/domain/calendar-date'
import { PageFrame } from '../../shared/ui/templates/PageFrame'
import type { OrdersRepository } from '../application/orders-repository'
import { ActiveOrdersContainer } from './active/ActiveOrdersContainer'
import { FinishedOrdersContainer } from './finished/FinishedOrdersContainer'
import { ChooseClientContainer } from './new/ChooseClientContainer'
import { NewOrderContainer } from './new/NewOrderContainer'
import { OrderRegistered } from './new/OrderRegistered'

type OrdersPageProps = {
  ordersRepository: OrdersRepository
  agendaRepository: AgendaRepository
  now: () => Date
  random: () => number
}

type OrdersView =
  | { name: 'active' }
  | { name: 'finished' }
  | { name: 'chooseClient' }
  | { name: 'newOrder'; appointment?: Appointment }
  | { name: 'registered'; ticket: string }

export function OrdersPage({ ordersRepository, agendaRepository, now, random }: OrdersPageProps) {
  const [view, setView] = useState<OrdersView>({ name: 'active' })
  const today = todayInCancun(now())
  const showActive = () => setView({ name: 'active' })

  return (
    <PageFrame title="Pedidos">
      {view.name === 'active' && (
        <ActiveOrdersContainer
          repository={ordersRepository}
          onNewOrder={() => setView({ name: 'chooseClient' })}
          onShowFinished={() => setView({ name: 'finished' })}
        />
      )}
      {view.name === 'finished' && (
        <FinishedOrdersContainer repository={ordersRepository} onBack={showActive} />
      )}
      {view.name === 'chooseClient' && (
        <ChooseClientContainer
          ordersRepository={ordersRepository}
          agendaRepository={agendaRepository}
          today={today}
          onChooseAppointment={(appointment) => setView({ name: 'newOrder', appointment })}
          onChooseWalkIn={() => setView({ name: 'newOrder' })}
          onBack={showActive}
        />
      )}
      {view.name === 'newOrder' && (
        <NewOrderContainer
          ordersRepository={ordersRepository}
          agendaRepository={agendaRepository}
          random={random}
          today={today}
          appointment={view.appointment}
          onRegistered={(ticket) => setView({ name: 'registered', ticket })}
          onCancel={showActive}
        />
      )}
      {view.name === 'registered' && <OrderRegistered ticket={view.ticket} onDone={showActive} />}
    </PageFrame>
  )
}
