import { useState } from 'react'
import { Button } from '../../shared/ui/atoms/Button'
import { PageFrame } from '../../shared/ui/templates/PageFrame'
import type { AgendaRepository } from '../application/agenda-repository'
import { todayInCancun, type CalendarDate } from '../../shared/domain/calendar-date'
import { DayAgendaContainer } from './day/DayAgendaContainer'
import { MyScheduleContainer } from './schedule/MyScheduleContainer'
import { WeekAgendaContainer } from './week/WeekAgendaContainer'

type AgendaPageProps = {
  repository: AgendaRepository
  now: () => Date
}

type AgendaView = 'day' | 'week' | 'schedule'

export function AgendaPage({ repository, now }: AgendaPageProps) {
  const [view, setView] = useState<AgendaView>('day')
  const [selectedDate, setSelectedDate] = useState(() => todayInCancun(now()))

  const showDay = (date: CalendarDate) => {
    setSelectedDate(date)
    setView('day')
  }

  const myScheduleButton = view !== 'schedule' && (
    <Button icon="schedule" onClick={() => setView('schedule')}>
      Mi horario
    </Button>
  )

  return (
    <PageFrame title="Agenda" action={myScheduleButton}>
      {view === 'day' && (
        <DayAgendaContainer
          repository={repository}
          now={now}
          date={selectedDate}
          onDateChange={setSelectedDate}
          onShowWeek={() => setView('week')}
        />
      )}
      {view === 'week' && (
        <WeekAgendaContainer
          repository={repository}
          now={now}
          date={selectedDate}
          onChooseDay={showDay}
          onBackToDay={() => setView('day')}
        />
      )}
      {view === 'schedule' && (
        <MyScheduleContainer repository={repository} onDone={() => setView('day')} />
      )}
    </PageFrame>
  )
}
