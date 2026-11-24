import { useState } from 'react'
import type { AgendaRepository } from '../../agenda/application/agenda-repository'
import { MyScheduleContainer } from '../../agenda/ui/schedule/MyScheduleContainer'
import type { OrdersRepository } from '../../orders/application/orders-repository'
import { NewOrderContainer } from '../../orders/ui/new/NewOrderContainer'
import { OrderRegistered } from '../../orders/ui/new/OrderRegistered'
import { todayInCancun } from '../../shared/domain/calendar-date'
import { Button } from '../../shared/ui/atoms/Button'
import { PageFrame } from '../../shared/ui/templates/PageFrame'
import { CalendarScreen, type CalendarView } from './CalendarScreen'

type AgendaCalendarPageProps = {
  agendaRepository: AgendaRepository
  ordersRepository: OrdersRepository
  now: () => Date
  random: () => number
}

type PageScreen = { name: 'calendar' } | { name: 'schedule' } | { name: 'newOrder' } | { name: 'registered'; ticket: string }

// Appointments and orders in one calendar. "Mi horario" and "Nuevo pedido" take the page
// and come back to the calendar where the admin left it.
export function AgendaCalendarPage({ agendaRepository, ordersRepository, now, random }: AgendaCalendarPageProps) {
  const [screen, setScreen] = useState<PageScreen>({ name: 'calendar' })
  const [view, setView] = useState<CalendarView>('month')
  const [date, setDate] = useState(() => todayInCancun(now()))
  const today = todayInCancun(now())
  const showCalendar = () => setScreen({ name: 'calendar' })

  const pageActions = screen.name === 'calendar' && (
    <div className="flex flex-wrap gap-3">
      <Button icon="schedule" onClick={() => setScreen({ name: 'schedule' })}>
        Mi horario
      </Button>
      <Button variant="primary" icon="add" onClick={() => setScreen({ name: 'newOrder' })}>
        Nuevo pedido
      </Button>
    </div>
  )

  return (
    <PageFrame title="Agenda" action={pageActions}>
      {screen.name === 'calendar' && (
        <CalendarScreen
          agendaRepository={agendaRepository}
          ordersRepository={ordersRepository}
          now={now}
          view={view}
          date={date}
          onViewChange={setView}
          onDateChange={setDate}
        />
      )}
      {screen.name === 'schedule' && (
        <MyScheduleContainer repository={agendaRepository} today={today} onDone={showCalendar} />
      )}
      {screen.name === 'newOrder' && (
        <NewOrderContainer
          ordersRepository={ordersRepository}
          agendaRepository={agendaRepository}
          random={random}
          today={today}
          onRegistered={(ticket) => setScreen({ name: 'registered', ticket })}
          onCancel={showCalendar}
        />
      )}
      {screen.name === 'registered' && <OrderRegistered ticket={screen.ticket} onDone={showCalendar} />}
    </PageFrame>
  )
}
